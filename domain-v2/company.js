import md5 from 'md5'

export default class Company {
  constructor(repository) {
    this.repository = repository
  }

  async create(name, prefixIndexElastic, callback) {
    const token = md5(name + callback + new Date())
    const company = await this.repository.save(name, prefixIndexElastic, callback, token)

    return company
  }

  async getAll() {
    try {
      const companies = await this.repository.getAll()

      return companies
    } catch (err) {
      return err
    }
  }

  async getById(id) {
    try {
      const company = await this.repository.getById(id)

      return company
    } catch (err) {
      return err
    }
  }

  async update(id, name, callback, activated) {
    try {
      const company = await this.repository.update(id, name, callback, activated)

      return company
    } catch (err) {
      return err
    }
  }
}
