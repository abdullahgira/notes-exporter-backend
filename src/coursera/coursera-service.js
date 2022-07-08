const fs = require('fs')

const exportNotesFromCoursera = async path => {
  const data = fs.readFileSync(path, 'utf-8')
  const notes = _filterNotes(data)
  const title = `Highlights from ${_getTitle(data)} - Coursera`

  fs.unlinkSync(path)
  return { title, highlights: notes }
}

/**
 * @param {string} data
 * @returns {[{note: '', link: ''}]} array of objects
 */
function _filterNotes(data) {
  const notesRegexp =
    /<p\s+class=\".*?\"\s+data-e2e="video-section-text">(.*?)<\/p>(<\/div><p.*?data-e2e="video-note-text">(.*?)<\/p>)*/gm
  const linksRegexp = /\/learn\/[\w\d-]+\/lecture\/[\w]+\?t=\d+/gm

  const matchedNotes = [...data.matchAll(notesRegexp)]
  const matchedLinks = [...data.matchAll(linksRegexp)]

  const returnVal = []
  for (let i = 0; i < matchedNotes.length; i++) {
    const link = matchedLinks[i]
    const note = matchedNotes[i]

    returnVal.push({
      note: note[1],
      ...(note[3] && { yourNote: note[3] }),
      link: `https://www.coursera.org${link}`,
    })
  }

  return returnVal
}

function _getTitle(data) {
  const regexp = /<title>(.*?)<\/title>/gm
  const matches = data.matchAll(regexp)

  for (const match of matches) return match[1].split('-')[0].trim()
}

const courseraService = {
  exportNotesFromCoursera: exportNotesFromCoursera,
}

module.exports = courseraService
