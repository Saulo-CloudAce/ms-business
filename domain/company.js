const md5 = require('md5')

class Company {
  constructor (repository) {
    this.repository = repository
  }

  async create (name, callback) {
    try {
      const token = md5(name + callback + new Date())
      const company = await this.repository.save(name, callback, token)

      return company
    } catch (err) {
      return err
    }
  }

  async getAll () {
    try {
      const companies = await this.repository.getAll()

      return companies
    } catch (err) {
      return err
    }
  }

  async getById (id) {
    try {
      const company = await this.repository.getById(id)

      return company
    } catch (err) {
      return err
    }
  }

  async update (id, name, callback, activated) {
    try {
      const company = await this.repository.update(id, name, callback, activated)

      return company
    } catch (err) {
      return err
    }
  }
}

module.exports = Company
