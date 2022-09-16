const util = require('util')
const { setTimeout } = require('timers/promises')

const puppeteer = require('puppeteer')
const { getSubtitles } = require('youtube-captions-scraper')

let browser

const DEFAULT_SKIP_INTERVAL = 10

const exportNotesFromYoutube = async (url, timestamps) => {
  url = url.replace(/&t=\d+s/gm, '')
  const videoID = _getVideoIdFromUrl(url)

  const formattedTimestamps = _formatInputTimestamps(
    timestamps.split('\n').filter(Boolean),
  )

  const rangeTimestamps = formattedTimestamps.map(t => _getSkipIntervalV2(t))

  const videoTranscripts = await getSubtitles({ videoID, lang: 'en' })

  const notes = _getRangeTimestampNotesFromVideoV2(
    rangeTimestamps,
    videoTranscripts,
    url,
  )

  return { title: '', notes }
}

async function _tryGettingVideoTimestmaps(url, ntimes = 3) {
  while (ntimes--) {
    try {
      const timestamps = await _getVideoTimestamps(url)
      return timestamps
    } catch (e) {
      console.error(e)
      if (ntimes) console.log(`trying again (${ntimes})`)
      else console.error(e)
    }
  }
}

async function _getVideoTimestamps(url) {
  const browser = await _launchBrowser()
  const page = await browser.newPage()

  console.info('Fetching url..')
  await page.goto(url, { waitUntil: 'load' })

  try {
    console.info('Rejecting cookies...')
    try {
      await page.waitForSelector(
        '[aria-label="Reject the use of cookies and other data for the purposes described"]',
        { timeout: 5000 },
      )
      await page.click(
        '[aria-label="Reject the use of cookies and other data for the purposes described"]',
      )
      await page.reload({ waitUntil: 'load' })
    } catch (e) {
      console.info(`No cookies screen!`)
    }

    try {
      console.info('Trying first dropdown selector')
      await page.waitForSelector(
        '#primary #menu-container button[aria-label="More actions"]',
      )
      await page.click(
        '#primary #menu-container button[aria-label="More actions"]',
      )
    } catch (e) {
      console.info('Failed. Trying second dropdown selector')
      await page.waitForSelector(
        '#primary #top-row [aria-label="More actions"]',
      )
      await page.click('#primary #top-row [aria-label="More actions"]')
    }

    // get video title
    console.info('Getting title...')
    await page.waitForSelector('#container > h1')
    const title = await page.evaluate(() => {
      const title = document.querySelector('#container > h1')
      return title.textContent.replace(/(\r\n|\n|\r)/gm, ' ').trim()
    })

    // click show transcriptions
    console.info('Getting transcriptions...')
    await page.waitForSelector(
      '#items > ytd-menu-service-item-renderer:nth-child(2)',
    )
    await page.click('#items > ytd-menu-service-item-renderer:nth-child(2)')

    await page.waitForSelector('.segment-text.ytd-transcript-segment-renderer')
    const transcript = await page.evaluate(() => {
      const data = []
      const textList = document.querySelectorAll(
        '.segment-text.ytd-transcript-segment-renderer',
      )
      const timeList = document.querySelectorAll(
        '.segment-timestamp.ytd-transcript-segment-renderer',
      )

      for (let i = 0; i < timeList.length; i++) {
        const timestampSegment = timeList[i].textContent
          .replace(/(\r\n|\n|\r)/gm, ' ')
          .trim()
        const transcriptSegment = textList[i].textContent
          .replace(/(\r\n|\n|\r)/gm, ' ')
          .trim()
        data.push({ time: timestampSegment, transcript: transcriptSegment })
      }
      return data
    })
    console.info('Done.')

    await page.close()
    return { title, transcript }
  } catch (e) {
    await page.close()
  }
}

function _getSkipInterval(time) {
  let [timeOnly, intervalInSeconds] = time.split(',')
  intervalInSeconds = intervalInSeconds || DEFAULT_SKIP_INTERVAL

  // let intervalInSeconds = time.split(',')[1] || DEFAULT_SKIP_INTERVAL
  let [hour, min, sec] = timeOnly.split(':')

  hour = parseInt(hour)
  min = parseInt(min)
  sec = parseInt(sec)
  intervalInSeconds = parseInt(intervalInSeconds)

  // we don't have hours column, then shift the columns
  if (!sec) {
    sec = min
    min = hour
    hour = 0
  }

  const addedSec = sec + ((intervalInSeconds % 3600) % 60)
  // const addedMin = addedSec < sec ? (min + 1) % 60 : min
  const addedMin = min + parseInt((intervalInSeconds % 3600) / 60)
  // const addedHours = addedMin < min ? hour + 1 : hour
  const addedHours = hour + parseInt(intervalInSeconds / 3600)

  const intervalToRemove = 5

  let removedSec = 0,
    removedMin = 0,
    removedHours = 0
  if (min || hour) {
    removedSec =
      sec - intervalToRemove < 0
        ? 60 + (sec - intervalToRemove)
        : sec - intervalToRemove
    removedMin = removedSec < sec ? min : min - 1 < 0 ? 60 + (min - 1) : min - 1
    removedHours = removedMin <= min ? hour : hour - 1
  } else {
    removedSec = sec - intervalToRemove < 0 ? 0 : sec - intervalToRemove
  }

  const postTime = `${addedHours ? addedHours + ':' : ''}${
    addedHours ? _formatTime(addedMin) : addedMin
  }:${_formatTime(addedSec)}`

  const preTime = `${removedHours ? removedHours + ':' : ''}${
    removedHours ? _formatTime(removedMin) : removedMin
  }:${_formatTime(removedSec)}`

  return { postTime, preTime, duration: intervalInSeconds }
}

function _getSkipIntervalV2(time) {
  let [timeOnly, intervalInSeconds] = time.split(',')
  intervalInSeconds = intervalInSeconds || DEFAULT_SKIP_INTERVAL

  let hour, min, sec
  let splittedTime = timeOnly.split(':')

  if (splittedTime.length === 3) [hour, min, sec] = timeOnly.split(':')
  else [min, sec] = timeOnly.split(':')

  hour = parseInt(hour)
  min = parseInt(min)
  sec = parseInt(sec)
  intervalInSeconds = parseInt(intervalInSeconds)

  let seconds = _getTimeInSeconds(hour, min, sec)
  let preTime = seconds - 5
  let postTime = seconds + intervalInSeconds

  return { preTime, postTime, duration: intervalInSeconds }
}

function _formatInputTimestamps(timestamps) {
  return timestamps.map(t => {
    let [h, m, s] = t.split(':')
    let d = t.split(',')[1]

    h = parseInt(h)
    m = parseInt(m)
    s = parseInt(s)

    if (!s) {
      s = m
      m = h
      h = 0
    }

    return `${h ? h + ':' : ''}${h ? _formatTime(m) : m}:${_formatTime(s)}${
      d ? `,${d}` : ''
    }`
  })
}

function _getRangeTimestampNotesFromVideo(
  rangeTimestamps,
  videoTimestamps,
  url,
) {
  return rangeTimestamps.map(r => {
    const matchedPreIndex = _matchPreTimeFromVideoTimestamps(
      r.preTime,
      videoTimestamps,
    )
    const matchedPostIndex = _matchPostTimeFromVideoTimestamps(
      r.postTime,
      videoTimestamps,
    )

    const transcriptsToJoin = videoTimestamps.slice(
      matchedPreIndex,
      matchedPostIndex + 1,
    )

    const note = transcriptsToJoin.map(t => t.transcript).join(' ')
    const link = _getTimestampLink(transcriptsToJoin[0].time, url)
    return { note, link, from: r.preTime, to: r.postTime }
  })
}

function _getRangeTimestampNotesFromVideoV2(
  rangeTimestamps,
  videoTranscripts,
  url,
) {
  return rangeTimestamps.map(r => {
    const matchedPreIndex = _matchPreTimeWithVideoCaption(
      r.preTime,
      videoTranscripts,
    )
    const matchedPostIndex = _matchPostTimeWithVideoCaption(
      r.postTime,
      videoTranscripts,
    )

    const transcriptsToJoin = videoTranscripts.slice(
      matchedPreIndex,
      matchedPostIndex + 1,
    )

    const note = transcriptsToJoin.map(t => t.text).join(' ')

    // convert start time to int instead of float to use in the link
    const link = _getTimestampLinkV2(parseInt(transcriptsToJoin[0].start), url)
    return { note, link, from: r.preTime, to: r.postTime }
  })
}

function _getTimestampLink(time, url) {
  const timeInSeconds = _timeInSeconds(time)
  return `${url}&t=${timeInSeconds}s`
}

function _getTimestampLinkV2(seconds, url) {
  return `${url}&t=${seconds}s`
}

function _timeInSeconds(time) {
  let [h, m, s] = time.split(':')
  h = parseInt(h)
  m = parseInt(m)
  s = parseInt(s)

  if (!s) {
    s = m
    m = h
    h = 0
  }
  return h * 60 + m * 60 + s
}

function _matchPreTimeFromVideoTimestamps(timestampToMatch, videoTimestamps) {
  const allPrev = videoTimestamps.filter(
    vt => _timeInSeconds(vt.time) <= _timeInSeconds(timestampToMatch),
  )
  const prevIndex = videoTimestamps.findIndex(
    vt => vt.time === allPrev[allPrev.length - 1].time,
  )
  return prevIndex
}

function _matchPreTimeWithVideoCaption(timestampToMatch, videoTimestamps) {
  const allPrev = videoTimestamps.filter(
    vt => parseFloat(vt.start) <= timestampToMatch,
  )

  return allPrev.length - 1
}

function _matchPostTimeFromVideoTimestamps(timestampToMatch, videoTimestamps) {
  const allPost = videoTimestamps.filter(
    vt => _timeInSeconds(vt.time) >= _timeInSeconds(timestampToMatch),
  )
  if (!allPost.length) return videoTimestamps.length - 1

  const postIndex = videoTimestamps.findIndex(vt => vt.time === allPost[0].time)
  return postIndex
}

function _matchPostTimeWithVideoCaption(timestampToMatch, videoTimestamps) {
  const allPost = videoTimestamps.filter(
    vt => parseFloat(vt.start) >= timestampToMatch,
  )
  if (!allPost.length) return videoTimestamps.length - 1

  const postIndex = videoTimestamps.findIndex(
    vt => vt.start === allPost[0].start,
  )
  return postIndex
}

function _formatTime(time) {
  return time < 10 ? `0${time}` : time
}

async function _launchBrowser() {
  if (browser?.isConnected()) return browser
  else {
    browser = await puppeteer.launch({
      // headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
      ],
    })

    return browser
  }
}

function _getVideoIdFromUrl(url) {
  const videoId = ''
  const pattern =
    /^https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w\d-]+)/

  const groups = url.match(pattern)

  if (!groups?.length) return
  return groups[1]
}

function _getTimeInSeconds(hour = 0, min = 0, sec = 0) {
  if (hour) return hour * 60 * 60 + min * 60 + sec
  return min * 60 + sec
}

const youtubeService = {
  exportNotesFromYoutube: exportNotesFromYoutube,
}

module.exports = youtubeService
