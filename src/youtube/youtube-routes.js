const upload = require('../lib/multer-lib')
const youtubeService = require('./youtube-service')

const router = require('express').Router()

router.post('/', handleNotesExport)

async function handleNotesExport(req, res) {
  const notes = await youtubeService.exportNotesFromYoutube(
    req.body.url,
    req.body.timestamps,
  )
  return res.json(notes)
}

module.exports = router
