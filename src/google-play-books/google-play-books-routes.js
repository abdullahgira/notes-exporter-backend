const upload = require('../lib/multer-lib')
const googlePlayBooksService = require('./google-play-books-service')

const router = require('express').Router()

router.post('/', upload().single('file'), handleNotesExport)

async function handleNotesExport(req, res) {
  const notes = await googlePlayBooksService.exportNotesFromGooglePlayBooks(
    req.file.path,
  )
  return res.json(notes)
}

module.exports = router
