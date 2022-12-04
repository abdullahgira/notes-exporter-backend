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
    /<td\s+class="\w+"\s+colspan="\d+"\s+rowspan="\d+"><p\s+class="\w+"><span\s+class="\w+">([\w\W][^<>]+?)<\/span><\/p><p\s+class="[\w\s]+"><span\s+class="\w+"><\/span><\/p>(<p\s+class="\w+"><span\s+class="\w+">([\w\W][^<>]+?)<\/span><\/p><p\s+class="[\w\s]+"><span\s+class="\w+"><\/span><\/p>)?<p\s+class="\w+"><span\s+class="\w+">.*?<\/span><\/p><\/td><td.*?href="(.*?)"/gm
  const regexp2 =
    /<td\s+colspan="\d+"\s+rowspan="\d+"\s+style="[\w#&;\d\-:]+"><p\s+style=".*?"><span\s+style=".*?">([\w\W][^<>]+?)<\/span><\/p><p\s+style=".*?"><span\s+style=".*?"><\/span><\/p>(<p\s+style=".*?"><span\s+style=".*?">([\w\W][^<>]+?)<\/span><\/p><p\s+style=".*?"><span\s+style=".*?"><\/span><\/p>)?<p\s+style=".*?"><span\s+style=".*?">.*?<\/span><\/p><\/td><td.*?href="(.*?)"/gm
  let m
  let returnVal = []

  let matches = [...data.matchAll(regexp)]

  if (!matches.length) matches = [...data.matchAll(regexp2)]

  for (const match of matches)
    returnVal.push({ note: he.decode(match[1]), link: match[4], ...(match[3] && {yourNote: match[3]}) })

  return returnVal
}

const googlePlayBooksService = {
  exportNotesFromGooglePlayBooks,
}

function _getTitle(data) {
  const regexp = /<td.*?><h1.*?class=".*?"><span.*?>(.*?)<\/span>/gm
  const regexp2 = /<h1.*?><span.*?>(.*?)<\/span><\/h1>/gm
  let matches = [...data.matchAll(regexp)]

  if (!matches.length) matches = [...data.matchAll(regexp2)]

  return he.decode(matches[0][1])
}

module.exports = googlePlayBooksService
