const fs = require('fs')

const S3Client = require('../../config/s3')

const bucketDefault = process.env.BUCKET

class StorageService {
  constructor () {
    this._client = S3Client.newInstance()
  }

  async upload (dirBucket, dirFile, fileName, bucket = bucketDefault, publicAccess = false) {
    return new Promise((resolve, reject) => {
      const fileInfos = {
        localFile: dirFile,
        s3Params: {
          Bucket: bucket,
          ACL: (publicAccess) ? 'public-read' : 'private',
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

  async listObjects (dirBucket, bucket) {
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

  async downloadFile (dirBucket, bucket, localPath) {
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
      downloader.on('error', err => reject(err.stack))
      downloader.on('end', () => resolve(true))
    })
  }
}

module.exports = StorageService
