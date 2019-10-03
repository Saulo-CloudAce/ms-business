const MongoClient = require('mongodb').MongoClient

async function connect (app, callback) {
  let connectionMongo = ''
  process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD ? connectionMongo = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DATABASE}` : connectionMongo = `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`

  MongoClient.connect(connectionMongo, { promiseLibrary: Promise }, (err, conn) => {
    if (err) {
      console.error(`Falha ao conectar ao banco de dados. ${err.stack}`)
    }
    var db = conn.db(process.env.MONGO_DATABASE)
    app.locals.db = db
    callback()
  })
}

module.exports = { connect }
