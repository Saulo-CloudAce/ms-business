const ObjectID = require('mongodb').ObjectID

class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (companyId, name, filePath, fields, quantityRows, fieldsData) {
    const data = { companyId, name, filePath, fields, quantityRows, data: fieldsData }

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

  async getAll (companyId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ companyId: new ObjectID(companyId) }).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getById (companyId, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyId: new ObjectID(companyId) })

      await this.mongodb.disconnect()

      return business
    } catch (err) {
      return err
    }
  }
}

module.exports = BusinessRepository
