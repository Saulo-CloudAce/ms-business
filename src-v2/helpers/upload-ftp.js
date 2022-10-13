import Client from 'ssh2-sftp-client'

export default async function uploadFileFTP(filePath = '', filename = '') {
  console.time(`Write file FTP ${filePath}`)
  const sftp = new Client()

  await sftp.connect({
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD
  })

  const dstFilepath = `/Import/DT/${filename}`

  await sftp.put(filePath, dstFilepath)
  console.timeEnd(`Write file FTP ${filePath}`)
}
