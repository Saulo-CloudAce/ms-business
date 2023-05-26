import moment from 'moment'
import { ObjectId } from 'mongodb'

export default class CompanyRepository {
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
      newCompany._id = r.insertedId

      return newCompany
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
      const result = await this.db.collection('company').findOne({ _id: new ObjectId(id) })

      return result
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByToken(token) {
    try {
      if (global.cache.companies[token]) {
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
      const result = await this.db.collection('company').update({ _id: new ObjectId(id) }, { $set: { name, callback, activated, updated_at: moment().format() } })

      return result.ops[0]
    } catch (err) {
      throw new Error(err)
    }
  }
}
