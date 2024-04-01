import fs from 'fs'

import S3 from '../../config/s3.js'

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import moment from 'moment'

const bucketDefault = process.env.BUCKET
const dirMs = process.env.MSDIR

export default class StorageService {
  constructor() {
    this._client = S3.newInstance()
  }

  async upload(dirBucket, dirFile, fileName, bucket = bucketDefault, publicAccess = false, unlink = true) {
    return new Promise((resolve, reject) => {
      const currentDate = moment().format('YYYY-MM-DD')
      let fileKey = `${dirBucket}/${currentDate}/${fileName}`
      if (dirMs) fileKey = `${dirMs}/${fileKey}`
      const params = {
        Bucket: bucket,
        ACL: publicAccess ? 'public-read' : 'private',
        Body: fs.createReadStream(dirFile),
        Key: fileKey
      }

      const uploader = this._client
        .send(new PutObjectCommand(params))
        .then(() => {
          if (unlink) {
            fs.unlinkSync(dirFile)
          }

          resolve(`https://${bucket}.s3.amazonaws.com/${fileKey}`)
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  }

  async uploadFromEncoded(dirBucket, buffer, fileName, bucket = bucketDefault, publicAccess = false) {
    const currentDate = moment().format('YYYY-MM-DD')
    fileName = `${currentDate}/${fileName}`
    if (dirBucket && dirBucket.length > 0) fileName = `${dirBucket}/${fileName}`
    if (dirMs) fileName = `${dirMs}/${fileName}`
    const params = {
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentEncoding: 'utf8',
      ContentType: 'application/json',
      ACL: publicAccess ? 'public-read' : 'private'
    }

    const urlFile = `https://${bucket}.s3.amazonaws.com/${fileName}`

    await this._client.send(new PutObjectCommand(params))
    return urlFile
  }

  async uploadFromStream(dirBucket, buffer, fileName, bucket = bucketDefault, publicAccess = false) {
    return new Promise((resolve, reject) => {
      const currentDate = moment().format('YYYY-MM-DD')
      fileName = `${currentDate}/${fileName}`
      if (dirBucket && dirBucket.length > 0) fileName = `${dirBucket}/${fileName}`
      if (dirMs) fileName = `${dirMs}/${fileName}`
      const params = {
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'utf8',
        // ContentType: 'application/json',
        ACL: publicAccess ? 'public-read' : 'private'
      }

      // const urlFile = `https://${bucket}.s3.amazonaws.com/${fileName}`

      // await this._client.send(new PutObjectCommand(params))
      this._client
        .send(new PutObjectCommand(params))
        .then(() => {
          resolve(`https://${bucket}.s3.amazonaws.com/${fileName}`)
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

  async getSignedUrl(urlPrivate = '', bucket = bucketDefault) {
    const urlParts = urlPrivate.split('/')
    const key = urlParts.slice(-4).join('/')
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: 36000
    }
    const command = new GetObjectCommand(params)
    const url = await getSignedUrl(this._client, command, { expiresIn: 36000 })
    return url
  }
}
