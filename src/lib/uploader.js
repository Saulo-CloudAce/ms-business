const { uploadFromFile, uploadFromEncoded } = require('../helpers/upload-file')

class Uploader {
  constructor (bucket) {
    this.bucket = bucket
  }

  async upload (file) {
    const resultLinkFile = await uploadFromFile(this.bucket, file.path, file.name.replace(/\s/g, ''))
    return resultLinkFile
  }

  async uploadContent (dir, content, filename) {
    const resultLinkFile = await uploadFromEncoded(dir, JSON.stringify(content), filename.replace(/\s/g, ''))
    return resultLinkFile
  }
}

module.exports = Uploader
