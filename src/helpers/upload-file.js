const s3 = require('s3')
const fs = require('fs')

module.exports = async (dirBucket, dirFile, fileName, bucket) => new Promise((resolve, reject) => {
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

  if(bucket){
    fileInfos = {
      localFile: dirFile,
      s3Params: {
        Bucket: bucket,
        Key: `${dirBucket}/${fileName}`
      },
    }
  }else{
    fileInfos = {
      localFile: dirFile,
      s3Params: {
        Bucket: process.env.BUCKET,
        ACL: 'public-read',
        Key: `${dirBucket}/${fileName}`
      },
    }
  }

  const uploader = client.uploadFile(fileInfos)
  uploader.on('error', (err) => console.error("unable to upload:", err.stack))
  uploader.on('end', () => {
    try {
      fs.unlinkSync(dirFile)
      resolve(`https://s3.amazonaws.com/${bucket ? bucket : process.env.BUCKET}/${dirBucket}/${fileName}`)
    } catch (err) {
      console.log(err)
    }
  })
})