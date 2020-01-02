const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

class BusinessRepository {
  constructor (db) {
    this.db = db
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil, jumpFirstLine = false, dataSeparator = '', isBatch = true, invalids = []) {
    const data = { companyToken, name, filePath, templateId, jumpFirstLine, dataSeparator, isBatch, quantityRows, data: fieldsData, activeUntil, invalids, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }

    try {
      var r = await this.db.collection('business').insertOne(data)
      const id = r.insertedId
      return id
    } catch (err) {
      throw new Error(err)
    }
  }

  async markFlowPassed (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: true, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async unmarkFlowPassed (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: false, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateDataBusiness (businessId, data) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { data, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async activate (businessId, activeUntil) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: true, activeUntil, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async deactivate (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: false, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByNameAndTemplateId (companyToken, businessName, templateId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, templateId, name: { $regex: new RegExp(businessName, 'i') } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .sort({ createdAt: -1 })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatches (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, isBatch: { $ne: false } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBasicByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById (companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByListId (companyToken, listId) {
    var listIdQuery = listId.map(l => new ObjectID(l))
    try {
      const business = await this.db.collection('business').find({ companyToken: companyToken, _id: { $in: listIdQuery } }).toArray()

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataById (companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken })

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getExpiredBusiness (date) {
    try {
      const businessList = await this.db.collection('business').find({ activeUntil: date, active: true }, ['_id']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = BusinessRepository
