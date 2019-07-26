const UploadFile = require('../helpers/upload-file')

class Uploader {
  constructor (bucket) {
    this.bucket = bucket
  }

  async upload (file) {
    const resultLinkFile = await UploadFile(this.bucket, file.path, file.name.replace(/\s/g, ''))
    return resultLinkFile
  }
}

module.exports = Uploader
