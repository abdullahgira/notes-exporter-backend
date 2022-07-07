const upload = require('../lib/multer-lib')
const courseraService = require('./coursera-service')

const router = require('express').Router()

router.post('/', upload().single('file'), handleNotesExport)

async function handleNotesExport(req, res) {
  const notes = await courseraService.exportNotesFromCoursera(req.file.path)
  return res.json(notes)
}

module.exports = router
