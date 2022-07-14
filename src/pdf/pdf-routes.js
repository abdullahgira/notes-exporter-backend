const upload = require('../lib/multer-lib')
const pdfService = require('./pdf-service')

const router = require('express').Router()

router.post('/', upload().single('file'), handleNotesExport)

async function handleNotesExport(req, res) {
  const notes = await pdfService.exportNotesFromPDF(req.file)
  return res.json(notes)
}

module.exports = router
