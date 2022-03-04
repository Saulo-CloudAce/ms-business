import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

export async function connect(app, callback) {
  let connectionMongo = ''
  const config = { username: '', password: '', host: '', port: '', database: '', additionalParams: '' }

  if (process.env.NODE_ENV === 'test') {
    config.username = process.env.MONGO_USERNAME_TEST
    config.password = process.env.MONGO_PASSWORD_TEST
    config.host = process.env.MONGO_HOST_TEST
    config.port = process.env.MONGO_PORT_TEST
    config.database = process.env.MONGO_DATABASE_TEST
    config.additionalParams = process.env.MONGO_TEST_STRINGCONNECTION_PARAMS || ''
  } else {
    config.username = process.env.MONGO_USERNAME
    config.password = process.env.MONGO_PASSWORD
    config.host = process.env.MONGO_HOST
    config.port = process.env.MONGO_PORT
    config.database = process.env.MONGO_DATABASE
    config.additionalParams = process.env.MONGO_STRINGCONNECTION_PARAMS || ''
  }

  if (config.username && config.password) {
    connectionMongo = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`
  } else {
    connectionMongo = `mongodb://${config.host}:${config.port}/`
  }
  if (config.additionalParams) connectionMongo = `${connectionMongo}?${config.additionalParams}`

  MongoClient.connect(connectionMongo, { promiseLibrary: Promise }, (err, conn) => {
    if (err) console.error(`#00000 - Falha ao conectar ao banco de dados. ${err.stack}`)

    const db = conn.db(config.database)
    app.locals.db = db
    app.locals.conn = conn
    callback()
  })
}
