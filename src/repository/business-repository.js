const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil, jumpFirstLine = false) {
    const data = { companyToken, name, filePath, templateId, jumpFirstLine, quantityRows, data: fieldsData, activeUntil, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('business').insertOne(data)
      const id = r.insertedId
      return id
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async markFlowPassed (businessId) {
    try {
      const db = await this.mongodb.connect()
      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: true, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async unmarkFlowPassed (businessId) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: false, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async updateDataBusiness (businessId, data) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { data, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async activate (businessId, activeUntil) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: true, activeUntil, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async deactivate (businessId) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: false, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAll (companyToken) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business')
        .find({ companyToken: companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .sort({ createdAt: -1 })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAllByTemplate (companyToken, templateId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .sort({ createdAt: -1 })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAllBasicByTemplate (companyToken, templateId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])

      return business
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getDataById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken })

      return business
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getExpiredBusiness (date) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ activeUntil: date, active: true }, ['_id']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }
}

module.exports = BusinessRepository
