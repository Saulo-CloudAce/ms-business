const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

const { calcExpireTime } = require('../helpers/util')

class TemplateRepository {
  constructor (db) {
    this.db = db
  }

  async save (name, fields, companyToken, active, createdBy = 0) {
    const newTemplate = {
      name,
      fields,
      companyToken,
      active,
      createdAt: moment().format(),
      createdBy,
      updatedAt: moment().format(),
      updatedBy: createdBy
    }

    try {
      const r = await this.db.collection('business_template').insertOne(newTemplate)
      const templateId = r.insertedId

      return { _id: templateId }
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateActive (templateId, active, updatedBy) {
    try {
      const templateUpdated = { active, updateAt: moment().format(), updatedBy }
      await this.db.collection('business_template').update({ _id: new ObjectID(templateId) }, { $set: templateUpdated })

      return templateId
    } catch (err) {
      throw new Error(err)
    }
  }

  async update (templateId, companyToken, templateUpdate, updatedBy = 0) {
    try {
      templateUpdate.updatedAt = moment().format()
      templateUpdate.updatedBy = updatedBy

      const templateUpdated = { name: templateUpdate.name, fields: templateUpdate.fields, updatedAt: templateUpdate.updatedAt, updatedBy: templateUpdate.updatedBy }

      await this.db.collection('business_template').update({ _id: new ObjectID(templateId), companyToken }, { $set: templateUpdated })

      return templateUpdate
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByCompany (companyToken) {
    try {
      const result = await this.db.collection('business_template').find({ companyToken }, ['_id', 'name', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']).toArray()

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

      const result = await this.db.collection('business_template').findOne({ _id: new ObjectID(id), companyToken }, ['_id', 'name', 'fields', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])

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
