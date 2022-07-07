const multer = require('multer')
const path = require('path')

const uploadConfig = (size = 50 * 1024 * 1024 /* 50 MB */) =>
  multer.diskStorage({
    destination: 'uploads/',
    limits: {
      fileSize: size,
    },
    filename(req, file, cb) {
      cb(
        null,
        file.fieldname + '-' + Date.now() + path.extname(file.originalname),
      )
    },
    filetype(req, file, cb) {
      cb(null, path.extname(file.originalname))
    },
  })

const upload = ({
  size,
  acceptedTypes = {
    extname: /text|html/i,
    mimetype: /text|html|/i,
  },
} = {}) =>
  multer({
    storage: uploadConfig(size),
    async fileFilter(req, file, cb) {
      const extname = acceptedTypes.extname.test(
        path.extname(file.originalname),
      )
      const mimetype = acceptedTypes.mimetype.test(file.mimetype)

      if (mimetype && extname) {
        return cb(null, true)
      }

      cb(new Error(`Invalid file format`))
    },
  })

module.exports = upload
