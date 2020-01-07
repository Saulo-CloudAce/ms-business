const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

class CompanyRepository {
  constructor (db) {
    this.db = db
  }

  async save (name, prefixIndexElastic, callback, token) {
    const newCompany = { name, prefix_index_elastic: prefixIndexElastic, callback, token, activated: true, created_at: moment().format(), updated_at: moment().format() }

    try {
      var r = await this.db.collection('company').insertOne(newCompany)
      var company = r.ops[0]

      return company
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll () {
    try {
      var result = await this.db.collection('company').find({}).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById (id) {
    try {
      var result = await this.db.collection('company').findOne({ _id: new ObjectID(id) })

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByToken (token) {
    try {
      var result = await this.db.collection('company').findOne({ token })

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async update (id, name, callback, activated) {
    try {
      var result = await this.db.collection('company').update({ _id: new ObjectID(id) }, { $set: { name, callback, activated, updated_at: moment().format() } })

      return result.ops[0]
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = CompanyRepository
