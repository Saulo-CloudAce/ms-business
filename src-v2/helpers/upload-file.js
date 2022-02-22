// const s3 = require('s3')
const s3 = {}
import fs from 'fs'
import AWS from 'aws-sdk'

export const uploadFromFile = async (dirBucket, dirFile, fileName, bucket) =>
  new Promise((resolve, reject) => {
    let fileInfos = {}

    const client = s3.createClient({
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

    if (bucket) {
      fileInfos = {
        localFile: dirFile,
        s3Params: {
          Bucket: bucket,
          Key: `${dirBucket}/${fileName}`
        }
      }
    } else {
      fileInfos = {
        localFile: dirFile,
        s3Params: {
          Bucket: process.env.BUCKET,
          ACL: 'public-read',
          Key: `${dirBucket}/${fileName}`
        }
      }
    }

    const uploader = client.uploadFile(fileInfos)
    uploader.on('error', (err) => console.error('unable to upload:', err.stack))
    uploader.on('end', () => {
      try {
        fs.unlinkSync(dirFile)
        resolve(`https://s3.amazonaws.com/${process.env.BUCKET}/${dirBucket}/${fileName}`)
      } catch (err) {
        console.log(err)
      }
    })
  })

export async function uploadFromEncoded(dirBucket, buffer, fileName, nBucket) {
  const clientS3 = new AWS.S3({ accessKeyId: process.env.ACCESSKEYID, secretAccessKey: process.env.SECRETACCESSKEY })
  let urlFile = null
  const bucket = nBucket ? nBucket : process.env.BUCKET
  if (dirBucket && dirBucket.length > 0) fileName = `${dirBucket}/${fileName}`
  await clientS3.putObject(
    {
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentEncoding: 'utf8',
      ContentType: 'application/json',
      ACL: 'public-read'
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
