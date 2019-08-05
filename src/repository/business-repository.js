const ObjectID = require('mongodb').ObjectID

class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (companyToken, name, filePath, fields, quantityRows, fieldsData) {
    const data = { companyToken, name, filePath, fields, quantityRows, data: fieldsData }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('business').insertOne(data)
      const id = r.insertedId

      await this.mongodb.disconnect()

      return id
    } catch (e) {
      return e
    }
  }

  async getAll (companyToken) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ companyId: companyToken }).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyId: companyToken })

      await this.mongodb.disconnect()

      return business
    } catch (err) {
      return err
    }
  }
}

module.exports = BusinessRepository
