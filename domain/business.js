class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (name, file, fields, product) {
    try {
      const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields)

      if (valids.length === 0) {
        return new Error('Todas as linhas estão inválidas')
      }
      // const filePath = await this.uploader.upload(file)
      const filePath = null
      const businessId = await this.repository.save(name, filePath, fields, product, valids.length)

      await this.crmService.sendData(valids, businessId)

      return { businessId, invalids }
    } catch (e) {
      return e
    }
  }
}

module.exports = Business
