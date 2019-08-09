const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData) {
    const data = { companyToken, name, filePath, templateId, quantityRows, data: fieldsData, createdAt: moment().format() }

    const db = await this.mongodb.connect()
    var r = await db.collection('business').insertOne(data)
    const id = r.insertedId

    await this.mongodb.disconnect()

    return id
  }

  async getAll (companyToken) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ companyToken: companyToken }, ['_id', 'name', 'createdAt']).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getAllByTemplate (companyToken, templateId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'data', 'createdAt']).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'createdAt'])

      await this.mongodb.disconnect()

      return business
    } catch (err) {
      return err
    }
  }

  async getDataById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken })

      await this.mongodb.disconnect()

      return business
    } catch (err) {
      return err
    }
  }
}

module.exports = BusinessRepository
