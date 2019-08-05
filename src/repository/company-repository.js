const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

class CompanyRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (name, callback, token) {
    const newCompany = { name, callback, token, activated: true, created_at: moment().format(), updated_at: moment().format() }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection('company').insertOne(newCompany)
      const company = r.ops[0]

      await this.mongodb.disconnect()

      return company
    } catch (err) {
      return err
    }
  }

  async getAll () {
    try {
      const db = await this.mongodb.connect()
      var result = await db.collection('company').find({}).toArray()

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getById (id) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').findOne({ _id: new ObjectID(id) })

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async getByToken (token) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').findOne({ token })

      await this.mongodb.disconnect()

      return result
    } catch (err) {
      return err
    }
  }

  async update (id, name, callback, activated) {
    try {
      const db = await this.mongodb.connect()

      var result = await db.collection('company').update({ _id: new ObjectID(id) }, { $set: { name, callback, activated, updated_at: moment().format() } })

      await this.mongodb.disconnect()

      return result.ops[0]
    } catch (err) {
      return err
    }
  }
}

module.exports = CompanyRepository
