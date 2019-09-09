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

      await this.mongodb.disconnect()

      return { _id: templateId }
    } catch (err) {
      return err
    }
  }

  async updateActive (templateId, active) {
    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('business_template').update({ _id: new ObjectID(templateId) }, { $set: { active, updateAt: moment().format() } })

      await this.mongodb.disconnect()

      return templateId
    } catch (err) {
      console.error(err)
      return err
    }
  }

  async getAllByCompany (companyToken) {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('business_template').find({ companyToken }, ['_id', 'name', 'active', 'createdAt', 'updateAt']).toArray()

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getAllByName (name, companyToken) {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('business_template').find({ name, companyToken }, ['_id']).toArray()

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getById (id, companyToken) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name', 'fields', 'active', 'createdAt', 'updatedAt'])

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getNameById (id, companyToken) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name'])

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getNameById (id, companyToken) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name'])

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }
}

module.exports = TemplateRepository
