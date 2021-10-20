const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

const { calcExpireTime } = require('../helpers/util')

class TemplateRepository {
  constructor (db) {
    this.db = db
  }

  async save (name, fields, companyToken, active) {
    const newTemplate = { name, fields, companyToken, active, createdAt: moment().format(), updatedAt: moment().format() }

    try {
      const r = await this.db.collection('business_template').insertOne(newTemplate)
      const templateId = r.insertedId

      return { _id: templateId }
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateActive (templateId, active) {
    try {
      await this.db.collection('business_template').update({ _id: new ObjectID(templateId) }, { $set: { active, updateAt: moment().format() } })

      return templateId
    } catch (err) {
      throw new Error(err)
    }
  }

  async update (templateId, companyToken, templateUpdate) {
    try {
      templateUpdate.updatedAt = moment().format()

      await this.db.collection('business_template').update({ _id: new ObjectID(templateId), companyToken }, { $set: { name: templateUpdate.name, fields: templateUpdate.fields } })

      return templateUpdate
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByCompany (companyToken) {
    try {
      const result = await this.db.collection('business_template').find({ companyToken }, ['_id', 'name', 'active', 'createdAt', 'updateAt']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByName (name, companyToken) {
    try {
      const result = await this.db.collection('business_template').find({ name, companyToken }, ['_id']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByNameWhereIdNotIs (name, companyToken, templateId) {
    try {
      const result = await this.db.collection('business_template').find({ name, companyToken, _id: { $ne: new ObjectID(templateId) } }, ['_id']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById (id, companyToken) {
    try {
      if (global.cache.templates[id]) {
        const templateCached = global.cache.templates[id]
        if (templateCached && templateCached.expire && calcExpireTime(new Date(), templateCached.expire) < global.cache.default_expire) {
          console.log('TEMPLATE_CACHED')
        
          return templateCached.data
        } else {
          global.cache.templates[id] = null
        }
      }

      console.log('TEMPLATE_STORED')

      const result = await this.db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name', 'fields', 'active', 'createdAt', 'updatedAt'])

      global.cache.templates[id] = { data: result, expire: new Date() }

      return result
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getByListId (listId = [], companyToken = '') {
    try {
      const listObjectId = listId.map(id => new ObjectID(id))

      const result = await this.db.collection('business_template')
        .find({ _id: { $in: listObjectId }, companyToken }, ['_id', 'name', 'fields', 'active', 'createdAt', 'updatedAt'])
        .toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getNameById (id, companyToken) {
    try {
      const result = await this.db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name'])

      return result
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = TemplateRepository
