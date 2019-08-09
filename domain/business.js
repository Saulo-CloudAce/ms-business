class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyToken, name, file, fields, templateId) {
    const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields)

    if (valids.length === 0) {
      throw new Error('Todas as linhas estão inválidas')
    }

    const filePath = await this.uploader.upload(file)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids)

    await this.crmService.sendData(valids, companyToken, businessId)

    return { businessId, invalids }
  }

  async createFromJson (companyToken, name, fields, templateId, data) {
    const { invalids, valids } = await this.validator.validateAndFormatFromJson(data, fields)

    if (valids.length === 0) {
      throw new Error('Todas as linhas estão inválidas')
    }

    const businessId = await this.repository.save(companyToken, name, null, templateId, valids.length, valids)

    await this.crmService.sendData(valids, companyToken, businessId)

    return { businessId, invalids }
  }

  async getAll (companyToken) {
    try {
      return this.repository.getAll(companyToken)
    } catch (err) {
      return err
    }
  }

  async getDataById (companyToken, id) {
    try {
      return this.repository.getDataById(companyToken, id)
    } catch (err) {
      return err
    }
  }
}

module.exports = Business
