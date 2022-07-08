const fs = require('fs')
const he = require('he')

const exportNotesFromGooglePlayBooks = async path => {
  const data = fs.readFileSync(path, 'utf-8')
  const notes = _filterNotes(data)
  const title = _getTitle(data)

  fs.unlinkSync(path)
  return { title, highlights: notes }
}

/**
 * @param {string} data
 * @returns {[{note: '', link: ''}]} array of objects
 */
function _filterNotes(data) {
  const regexp =
    /<td\s+class="\w+"\s+colspan="\d+"\s+rowspan="\d+"><p\s+class="\w+"><span\s+class="\w+">([\w\W][^<>]+?)<\/span><\/p><p\s+class="[\w\s]+"><span\s+class="\w+"><\/span><\/p><p\s+class="\w+"><span\s+class="\w+">.*?<\/span><\/p><\/td><td.*?href="(.*?)"/gm
  let m
  let returnVal = []

  const matches = data.matchAll(regexp)

  for (const match of matches)
    returnVal.push({ note: he.decode(match[1]), link: match[2] })

  return returnVal
}

const googlePlayBooksService = {
  exportNotesFromGooglePlayBooks,
}

function _getTitle(data) {
  const regexp = /<td.*?><h1.*?class=".*?"><span.*?>(.*?)<\/span>/gm
  const matches = data.matchAll(regexp)

  for (const match of matches) return he.decode(match[1])
}

module.exports = googlePlayBooksService
