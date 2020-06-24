const s3 = require('s3')
const AWS = require('aws-sdk')

class S3Client {
  static newInstance () {
    return s3.createClient({
      maxAsyncS3: 20,
      s3RetryCount: 3,
      s3RetryDelay: 1000,
      multipartUploadThreshold: 400971520,
      multipartUploadSize: 15728640,
      s3Options: {
        accessKeyId: process.env.ACCESSKEYID,
        secretAccessKey: process.env.SECRETACCESSKEY
      }
    })
  }

  static newNativeInstance () {
    return new AWS.S3({
      accessKeyId: process.env.ACCESSKEYID,
      secretAccessKey: process.env.SECRETACCESSKEY
    })
  }
}

module.exports = S3Client
