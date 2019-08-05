class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyToken, name, file, fields) {
    try {
      const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields)

      if (valids.length === 0) {
        return new Error('Todas as linhas estão inválidas')
      }
      // const filePath = await this.uploader.upload(file)
      const filePath = null
      const businessId = await this.repository.save(companyToken, name, filePath, fields, valids.length, valids)

      await this.crmService.sendData(valids, companyToken, businessId)

      return { businessId, invalids }
    } catch (e) {
      return e
    }
  }

  async getAll (companyToken) {
    try {
      return this.repository.getAll(companyToken)
    } catch (err) {
      return err
    }
  }

  async getById (companyToken, id) {
    try {
      return this.repository.getById(companyToken, id)
    } catch (err) {
      return err
    }
  }
}

module.exports = Business
