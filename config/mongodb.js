const MongoClient = require('mongodb').MongoClient
var connection = null
var db = null

async function connect () {
  if (connection) return null

  const result = await new Promise((resolve, reject) => {
    MongoClient.connect(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`, (err, conn) => {
      if (err) {
        return resolve({ err, db: null })
      } else {
        connection = conn
        db = conn.db(process.env.MONGO_DATABASE)
        resolve({ err: null, db })
      }
    })
  })

  if (result.err) throw result.err
  return result.db
}

function disconnect () {
  if (!connection) return true
  connection.close()
  connection = null
  return true
}

module.exports = { connect, disconnect }
