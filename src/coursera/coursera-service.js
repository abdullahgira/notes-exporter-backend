const fs = require('fs')
const he = require('he')

const exportNotesFromCoursera = async path => {
  const data = fs.readFileSync(path, 'utf-8')
  const notes = _filterNotes(data)

  fs.unlinkSync(path)
  return notes
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

const courseraService = {
  exportNotesFromCoursera: exportNotesFromCoursera,
}

module.exports = courseraService
