const moment = require('moment')
const ObjectID = require('mongodb').ObjectID

class CompanyRepository {
  constructor(db) {
    this.db = db
  }

  async save(name, prefixIndexElastic, callback, token) {
    const newCompany = {
      name,
      prefix_index_elastic: prefixIndexElastic,
      callback,
      token,
      activated: true,
      created_at: moment().format(),
      updated_at: moment().format()
    }

    try {
      const r = await this.db.collection('company').insertOne(newCompany)
      const company = r.ops[0]

      return company
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll() {
    try {
      const result = await this.db.collection('company').find({}).toArray()

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById(id) {
    try {
      const result = await this.db.collection('company').findOne({ _id: new ObjectID(id) })

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByToken(token) {
    try {
      if (global.cache.companies[token]) {
        console.log('COMPANY_CACHED')
        const companyCached = global.cache.companies[token]
        return companyCached.data
      }

      const result = await this.db.collection('company').findOne({ token })

      global.cache.companies[token] = { data: result }
      console.log('COMPANY_STORED')

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async update(id, name, callback, activated) {
    try {
      const result = await this.db
        .collection('company')
        .update({ _id: new ObjectID(id) }, { $set: { name, callback, activated, updated_at: moment().format() } })

      return result.ops[0]
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = CompanyRepository
