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

  async listObjects(dirBucket, bucket) {
    return new Promise((resolve, reject) => {
      const params = {
        s3Params: {
          Bucket: bucket,
          Delimiter: '',
          EncodingType: 'url',
          MaxKeys: 50000,
          Prefix: dirBucket
        },
        recursive: true
      }

      let dataLst = []
      const listobj = this._client.listObjects(params)
      listobj.on('data', function (data) {
        dataLst = dataLst.concat(data.Contents)
        resolve(data.Contents)
      })
      listobj.on('error', function (error) {
        console.log(error)
        reject(error)
      })
    })
  }

  async downloadFile(dirBucket, bucket, localPath) {
    return new Promise((resolve, reject) => {
      const params = {
        localFile: localPath,
        s3Params: {
          Bucket: bucket,
          Key: dirBucket
        },
        recursive: true
      }

      const downloader = this._client.downloadFile(params)
      downloader.on('error', (err) => reject(err.stack))
      downloader.on('end', () => resolve(true))
    })
  }
}
