import moment from 'moment'
import { ObjectId } from 'mongodb'
import { isTypeTag } from '../helpers/field-methods.js'

export default class TemplateRepository {
  constructor(db = {}, cacheService = {}) {
    this.db = db
    this.cacheService = cacheService
  }

  async save(name, fields, companyToken, autoSponsor = false, showMultipleRegistersPerCustomer = false, active, createdBy = 0) {
    const newTemplate = {
      name,
      auto_sponsor: autoSponsor,
      show_multiple_registers_per_customer: showMultipleRegistersPerCustomer,
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

  async updateActive(templateId, active, updatedBy) {
    try {
      const templateUpdated = { active, updateAt: moment().format(), updatedBy }
      await this.db.collection('business_template').update({ _id: new ObjectId(templateId) }, { $set: templateUpdated })

      return templateId
    } catch (err) {
      throw new Error(err)
    }
  }

  async update(templateId, companyToken, templateUpdate, updatedBy = 0) {
    try {
      templateUpdate.updatedAt = moment().format()
      templateUpdate.updatedBy = updatedBy

      const templateUpdated = {
        name: templateUpdate.name,
        auto_sponsor: templateUpdate.auto_sponsor,
        show_multiple_registers_per_customer: templateUpdate.show_multiple_registers_per_customer,
        fields: templateUpdate.fields,
        updatedAt: templateUpdate.updatedAt,
        updatedBy: templateUpdate.updatedBy
      }

      await this.db.collection('business_template').update({ _id: new ObjectId(templateId), companyToken }, { $set: templateUpdated })

      await this.cacheService.removeTemplate(companyToken, templateId)

      return templateUpdate
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByCompany(companyToken) {
    try {
      const result = await this.db.collection('business_template').find({ companyToken }).project(['_id', 'name', 'auto_sponsor', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByName(name, companyToken) {
    try {
      const result = await this.db.collection('business_template').find({ name, companyToken }).project(['_id']).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllByNameWhereIdNotIs(name, companyToken, templateId) {
    try {
      const result = await this.db
        .collection('business_template')
        .find({ name, companyToken, _id: { $ne: new ObjectId(templateId) } })
        .project(['_id'])
        .toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById(id, companyToken) {
    try {
      const templateCached = await this.cacheService.getTemplate(companyToken, id)
      if (templateCached) {
        console.log('TEMPLATE_CACHED')
        return templateCached
      }

      console.log('TEMPLATE_STORED')

      const options = {
        projection: {
          _id: 1,
          name: 1,
          auto_sponsor: 1,
          show_multiple_registers_per_customer: 1,
          fields: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1,
          updatedBy: 1,
          createdBy: 1
        }
      }
      const result = await this.db.collection('business_template').findOne({ _id: new ObjectId(id), companyToken }, options)

      await this.cacheService.setTemplate(companyToken, id, result)

      return result
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getByIdWithoutTags(id, companyToken) {
    try {
      const options = {
        projection: {
          _id: 1,
          name: 1,
          auto_sponsor: 1,
          show_multiple_registers_per_customer: 1,
          fields: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1,
          updatedBy: 1,
          createdBy: 1
        }
      }
      const result = await this.db.collection('business_template').findOne({ _id: new ObjectId(id), companyToken }, options)

      if (result && result.fields) {
        const fields = []
        for (const field of result.fields) {
          if (isTypeTag(field)) {
            fields.push(...field.fields)
          } else {
            fields.push(field)
          }
        }
        result.fields = fields
      }

      return result
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getByListId(listId = [], companyToken = '') {
    try {
      const listObjectId = listId.map((id) => new ObjectId(id))

      const result = await this.db
        .collection('business_template')
        .find({ _id: { $in: listObjectId }, companyToken })
        .project(['_id', 'name', 'auto_sponsor', 'fields', 'active', 'createdAt', 'updatedAt'])
        .toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getNameById(id, companyToken) {
    try {
      const options = { projection: { _id: 1, name: 1 } }
      const result = await this.db.collection('business_template').findOne({ _id: new ObjectId(id), companyToken }, options)

      return result
    } catch (err) {
      throw new Error(err)
    }
  }
}
