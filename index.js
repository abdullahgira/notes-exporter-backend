require('dotenv/config')
require('make-promises-safe')
require('express-async-errors')

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())

// routes
app.use('/coursera', require('./src/coursera/coursera-routes'))
app.use('/notion', require('./src/notion/notion-routes'))
app.use(
  '/google-play-books',
  require('./src/google-play-books/google-play-books-routes'),
)

app.use((err, req, res, next) => {
  console.error(err)
  return res.json({
    error: `Something went wrong, may be you've not selected the file`,
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.info(`Listening on PORT ${PORT}`))
