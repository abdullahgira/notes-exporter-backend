const puppeteer = require('puppeteer')
let browser

const DEFAULT_SKIP_INTERVAL = 10

const exportNotesFromYoutube = async (url, timestamps) => {
  url = url.replace(/&t=\d+s/gm, '')

  const formattedTimestamps = _formatInputTimestamps(
    timestamps.split('\n').filter(Boolean),
  )
  const rangeTimestamps = formattedTimestamps.map(t => _getSkipInterval(t))
  console.log({ rangeTimestamps })

  const videoTimestamps = await _tryGettingVideoTimestmaps(url)

  const notes = _getRangeTimestampNotesFromVideo(
    rangeTimestamps,
    videoTimestamps.transcript,
    url,
  )

  return { title: videoTimestamps.title, notes }
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
      console.info('Traying first dropdown selector')
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
  let [hour, min, sec] = time.split(':')
  let intervalInSeconds = time.split(',')[1] || DEFAULT_SKIP_INTERVAL

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

function _getTimestampLink(time, url) {
  const timeInSeconds = _timeInSeconds(time)
  return `${url}&t=${timeInSeconds}s`
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

function _matchPostTimeFromVideoTimestamps(timestampToMatch, videoTimestamps) {
  const allPost = videoTimestamps.filter(
    vt => _timeInSeconds(vt.time) >= _timeInSeconds(timestampToMatch),
  )
  if (!allPost.length) return videoTimestamps.length - 1

  const postIndex = videoTimestamps.findIndex(vt => vt.time === allPost[0].time)
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

const youtubeService = {
  exportNotesFromYoutube: exportNotesFromYoutube,
}

module.exports = youtubeService
