const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

class BusinessRepository {
  constructor (db) {
    this.db = db
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil, jumpFirstLine = false, dataSeparator = '', isBatch = true, invalids = []) {
    const data = { companyToken, name, filePath, templateId, jumpFirstLine, customerStorage: 'running', dataSeparator, isBatch, quantityRows, data: fieldsData, activeUntil, invalids, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }

    try {
      var r = await this.db.collection('business').insertOne(data)
      const id = r.insertedId
      return id
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateCustomerStorageStatus (businessId, status) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { customerStorage: status, updatedAt: moment().format() } })
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
        .find({ companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplate (companyToken = '', templateId = '', flowPassed = '') {
    try {
      const filter = { templateId, companyToken }

      if (flowPassed !== '') {
        console.log(flowPassed)
        filter['flow_passed'] = flowPassed
      }

      const businessList = await this.db.collection('business')
        .find(filter, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateAndKeySortedReverse (companyToken, templateId, keyColumn = '', keyValue = '') {
    const businessList = []

    const matchParams = {}
    matchParams[keyColumn] = keyValue
    try {
      const searchParams = { companyToken, templateId, data: { $elemMatch: matchParams } }

      let businessListStored = await this.db.collection('business')
        .find(
          searchParams,
          { name: 1, parentBatchId: 1, activeUntil: 1, active: 1, createdAt: 1, updatedAt: 1, flow_passed: 1, data: { $elemMatch: matchParams } })
        .toArray()
      businessListStored = businessListStored.sort((a, b) => (a.createdAt > b.createdAt) ? -1 : ((b.createdAt > a.createdAt) ? 1 : 0))

      for (const i in businessListStored) {
        const bData = businessListStored[i]
        businessList.push({
          _id: (bData.parentBatchId) ? bData.parentBatchId : bData._id,
          name: bData.name,
          data: bData.data,
          activeUntil: bData.activeUntil,
          flow_passed: bData.flow_passed,
          active: bData.active,
          createdAt: bData.createdAt,
          updatedAt: bData.updatedAt
        })
      }

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
