const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

class TemplateRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (name, fields, companyToken, active) {
    const newTemplate = { name, fields, companyToken, active, createdAt: moment().format(), updatedAt: moment().format() }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('business_template').insertOne(newTemplate)
      var templateId = r.insertedId

      return { _id: templateId }
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async updateActive (templateId, active) {
    try {
      const db = await this.mongodb.connect()
      await db.collection('business_template').update({ _id: new ObjectID(templateId) }, { $set: { active, updateAt: moment().format() } })

      return templateId
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAllByCompany (companyToken) {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('business_template').find({ companyToken }, ['_id', 'name', 'active', 'createdAt', 'updateAt']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAllByName (name, companyToken) {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('business_template').find({ name, companyToken }, ['_id']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getById (id, companyToken) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name', 'fields', 'active', 'createdAt', 'updatedAt'])

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getNameById (id, companyToken) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name'])

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }
}

module.exports = TemplateRepository
