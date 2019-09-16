class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyToken, name, file, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine) {
    const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields, jumpFirstLine)

    if (valids.length === 0) {
      throw new Error('Todas as linhas estão inválidas')
    }

    const filePath = await this.uploader.upload(file)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, jumpFirstLine)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, prefixIndexElastic)

    return { businessId, invalids }
  }

  async createFromUrlFile (companyToken, name, filepath, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine) {
    const { invalids, valids } = await this.validator.validateAndFormatFromUrlFile(filepath, fields, jumpFirstLine)

    if (valids.length === 0) {
      throw new Error('Todas as linhas estão inválidas')
    }

    const businessId = await this.repository.save(companyToken, name, filepath, templateId, valids.length, valids, activeUntil, jumpFirstLine)

    var listFieldKey = fields.filter(f => f.key).map(f => f.data)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)

    return { businessId, invalids }
  }

  async createFromJson (companyToken, name, fields, templateId, data, activeUntil, prefixIndexElastic, requestBody) {
    const { invalids, valids } = await this.validator.validateAndFormatFromJson(data, fields)

    if (valids.length === 0) {
      throw new Error('Todas as linhas estão inválidas')
    }

    var filename = `${name}.json`
    const filePath = await this.uploader.uploadContent(companyToken, requestBody, filename)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil)

    var listFieldKey = fields.filter(f => f.key).map(f => f.data)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)

    return { businessId, invalids }
  }

  async getAll (companyToken) {
    try {
      return this.repository.getAll(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllByTemplateId (companyToken, templateId) {
    try {
      return this.repository.getAllByTemplate(companyToken, templateId)
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

  async updateDataBusiness (businessId, data) {
    try {
      return this.repository.updateDataBusiness(businessId, data)
    } catch (err) {
      return err
    }
  }
}

module.exports = Business
