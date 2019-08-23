const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil) {
    const data = { companyToken, name, filePath, templateId, quantityRows, data: fieldsData, activeUntil, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }

    const db = await this.mongodb.connect()
    var r = await db.collection('business').insertOne(data)
    const id = r.insertedId

    await this.mongodb.disconnect()

    return id
  }

  async markFlowPassed (businessId) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: true, updatedAt: moment().format() } })

      await this.mongodb.disconnect()
    } catch (err) {
      console.log(err)
      return err
    }
  }

  async unmarkFlowPassed (businessId) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: false, updatedAt: moment().format() } })

      await this.mongodb.disconnect()
    } catch (err) {
      console.log(err)
      return err
    }
  }

  async updateDataBusiness (businessId, data) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { data, updatedAt: moment().format() } })

      await this.mongodb.disconnect()
    } catch (err) {
      console.log(err)
      return err
    }
  }

  async activate (businessId, activeUntil) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: true, activeUntil, updatedAt: moment().format() } })

      await this.mongodb.disconnect()
    } catch (err) {
      console.log(err)
      return err
    }
  }

  async deactivate (businessId) {
    try {
      const db = await this.mongodb.connect()

      await db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: false, updatedAt: moment().format() } })

      await this.mongodb.disconnect()
    } catch (err) {
      console.log(err)
      return err
    }
  }

  async getAll (companyToken) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business')
        .find({ companyToken: companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .sort({ createdAt: -1 })
        .toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getAllByTemplate (companyToken, templateId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .sort({ createdAt: -1 })
        .toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getAllBasicByTemplate (companyToken, templateId) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt']).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }

  async getById (companyToken, id) {
    try {
      const db = await this.mongodb.connect()

      const business = await db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])

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

  async getExpiredBusiness (date) {
    try {
      const db = await this.mongodb.connect()

      const businessList = await db.collection('business').find({ activeUntil: date, active: true }, ['_id']).toArray()

      await this.mongodb.disconnect()

      return businessList
    } catch (err) {
      return err
    }
  }
}

module.exports = BusinessRepository
