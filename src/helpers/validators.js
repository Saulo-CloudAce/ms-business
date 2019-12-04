var mongodb = require('mongodb')

function mongoIdIsValid (id = null) {
  return mongodb.ObjectID.isValid(id)
}

function validateEmail (email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase())
}

function isArrayObject (array) {
  let isArrayObject = true
  if (!Array.isArray(array)) isArrayObject = false
  else {
    array.forEach(item => {
      if (typeof item !== 'object') {
        isArrayObject = false
      }
    })
  }

  return isArrayObject
}

module.exports = { mongoIdIsValid, validateEmail, isArrayObject }
