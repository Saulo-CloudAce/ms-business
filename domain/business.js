class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyId, name, file, fields) {
    try {
      const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields)

      if (valids.length === 0) {
        return new Error('Todas as linhas estão inválidas')
      }
      // const filePath = await this.uploader.upload(file)
      const filePath = null
      const businessId = await this.repository.save(companyId, name, filePath, fields, valids.length, valids)

      await this.crmService.sendData(valids, businessId)

      return { businessId, invalids }
    } catch (e) {
      return e
    }
  }

  async getAll (companyId) {
    try {
      return this.repository.getAll(companyId)
    } catch (err) {
      return err
    }
  }

  async getById (companyId, id) {
    try {
      return this.repository.getById(companyId, id)
    } catch (err) {
      return err
    }
  }
}

module.exports = Business
