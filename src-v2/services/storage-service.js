import fs from 'fs'
import AWS from 'aws-sdk'

import S3Client from '../../config/s3.js'

const bucketDefault = process.env.BUCKET

export default class StorageService {
  constructor() {
    this._client = S3Client.newInstance()
    this._nativeClient = S3Client.newNativeInstance()
  }

  async upload(dirBucket, dirFile, fileName, bucket = bucketDefault, publicAccess = false) {
    return new Promise((resolve, reject) => {
      const fileInfos = {
        localFile: dirFile,
        s3Params: {
          Bucket: bucket,
          ACL: publicAccess ? 'public-read' : 'private',
          Key: `${dirBucket}/${fileName}`
        }
      }

      const uploader = this._client.uploadFile(fileInfos)
      uploader.on('error', (err) => console.error('unable to upload:', err.stack))
      uploader.on('end', () => {
        try {
          fs.unlinkSync(dirFile)
          resolve(`https://s3.amazonaws.com/${bucket}/${dirBucket}/${fileName}`)
        } catch (err) {
          console.log(err)
          reject(err)
        }
      })
    })
  }

  async uploadFromEncoded(dirBucket, buffer, fileName, bucket = bucketDefault, publicAccess = false) {
    let urlFile = null

    if (dirBucket && dirBucket.length > 0) fileName = `${dirBucket}/${fileName}`

    await this._nativeClient.putObject(
      {
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'utf8',
        ContentType: 'application/json',
        ACL: publicAccess ? 'public-read' : 'private'
      },
      function (err) {
        if (err) {
          throw new Error(err)
        }
      }
    )
    urlFile = `https://${bucket}.s3.amazonaws.com/${fileName}`

    return urlFile
  }

  downloadFile(dirBucket = '', bucket = '') {
    const params = {
      Bucket: bucket,
      Key: dirBucket
    }

    const readStream = this._nativeClient.getObject(params).createReadStream()
    return readStream
  }
}
