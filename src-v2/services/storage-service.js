import fs from 'fs'

import S3 from '../../config/s3.js'

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const bucketDefault = process.env.BUCKET

export default class StorageService {
  constructor() {
    this._client = S3.newInstance()
  }

  async upload(dirBucket, dirFile, fileName, bucket = bucketDefault, publicAccess = false) {
    return new Promise((resolve, reject) => {
      const fileKey = `${dirBucket}/${fileName}`
      const params = {
        Bucket: bucket,
        ACL: publicAccess ? 'public-read' : 'private',
        Body: dirFile,
        Key: fileKey
      }

      const uploader = this._client
        .send(new PutObjectCommand(params))
        .then(() => {
          fs.unlinkSync(dirFile)
          resolve(`https://s3.amazonaws.com/${bucket}/${dirBucket}/${fileName}`)
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  }

  async uploadFromEncoded(dirBucket, buffer, fileName, bucket = bucketDefault, publicAccess = false) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'utf8',
        ContentType: 'application/json',
        ACL: publicAccess ? 'public-read' : 'private'
      }
      if (dirBucket && dirBucket.length > 0) fileName = `${dirBucket}/${fileName}`

      const urlFile = `https://${bucket}.s3.amazonaws.com/${fileName}`

      this._client
        .send(new PutObjectCommand(params))
        .then(() => {
          resolve(urlFile)
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  }

  async downloadFile(dirBucket = '', bucket = '', localpath = '') {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: bucket,
        Key: dirBucket
      }

      this._client
        .send(new GetObjectCommand(params))
        .then(async (data) => {
          data.Body.pipe(fs.createWriteStream(localpath))
            .on('error', (err) => reject(err))
            .on('close', () => resolve(localpath))
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  }
}
