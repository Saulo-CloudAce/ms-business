import StorageService from '../services/storage-service.js'

export default class Uploader {
  constructor(bucket) {
    this.bucket = bucket
    this._storageService = new StorageService()
  }

  async upload(file) {
    const filename = file.name.replace(/\s/g, '')
    const bucket = process.env.BUCKET
    const publicAccess = false
    const resultLinkFile = await this._storageService.upload(this.bucket, file.path, filename, bucket, publicAccess)
    return resultLinkFile
  }

  async uploadContent(dir, content, filename) {
    const bucket = process.env.BUCKET
    const publicAccess = false
    const resultLinkFile = await this._storageService.uploadFromEncoded(
      dir,
      JSON.stringify(content),
      filename.replace(/\s/g, ''),
      bucket,
      publicAccess
    )
    return resultLinkFile
  }
}
