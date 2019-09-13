const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

class CompanyRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (name, prefixIndexElastic, callback, token) {
    const newCompany = { name, prefix_index_elastic: prefixIndexElastic, callback, token, activated: true, created_at: moment().format(), updated_at: moment().format() }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('company').insertOne(newCompany)
      var company = r.ops[0]

      return company
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getAll () {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('company').find({}).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getById (id) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').findOne({ _id: new ObjectID(id) })

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async getByToken (token) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').findOne({ token })

      return result
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }

  async update (id, name, callback, activated) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').update({ _id: new ObjectID(id) }, { $set: { name, callback, activated, updated_at: moment().format() } })

      return result.ops[0]
    } catch (err) {
      throw new Error(err)
    } finally {
      await this.mongodb.disconnect()
    }
  }
}

module.exports = CompanyRepository
