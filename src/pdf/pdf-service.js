const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

const exportNotesFromPDF = async file => {
  const formData = new FormData()
  const stream = fs.createReadStream(file.path)
  formData.append('file', stream, file.filename)

  try {
    const response = await axios.post(process.env.PYTHON_BACKEND, formData, {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
      },
    })
    const notes = response.data

    fs.unlinkSync(file.path)
    return { highlights: notes }
  } catch (e) {
    console.error(e)
    return ''
  }
}

const pdfService = {
  exportNotesFromPDF: exportNotesFromPDF,
}

module.exports = pdfService
