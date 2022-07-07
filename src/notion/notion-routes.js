const upload = require('../lib/multer-lib')
const notionService = require('./notion-service')

const router = require('express').Router()

router.post('/', handleNotesExport)

async function handleNotesExport(req, res) {
  const notes = await notionService.exportNotesFromNotion(
    req.body.url,
    req.body.secret,
  )
  return res.json(notes)
}

module.exports = router
