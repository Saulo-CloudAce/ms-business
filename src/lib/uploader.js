const UploadFile = require('../helpers/upload-file')
const fileType = require('file-type')
const readChunk = require('read-chunk')

class Uploader {
    constructor (bucket) {
        this.bucket = bucket
    }

    async upload (file) {
        const buffer = readChunk.sync(file.path, 0, fileType.minimumBytes)
        const flType = fileType(buffer)

        const resultLinkFile = await UploadFile(this.bucket, file.path, file.name.replace(/\s/g, ''))
        return resultLinkFile
    }
}

module.exports = Uploader