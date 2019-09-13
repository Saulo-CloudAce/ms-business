var mongodb = require('mongodb')

function mongoIdIsValid (id = null) {
  return mongodb.ObjectID.isValid(id)
}

module.exports = { mongoIdIsValid }
