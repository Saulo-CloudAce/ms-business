class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyToken, name, file, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator) {
    const { invalids, valids } = await this.validator.validateAndFormat(file.path, fields, jumpFirstLine, dataSeparator)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const filePath = await this.uploader.upload(file)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator)

    var listFieldKey = fields.filter(f => f.key).map(f => f.data)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)

    return { businessId, invalids }
  }

  async createFromUrlFile (companyToken, name, filepath, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator) {
    const { invalids, valids } = await this.validator.validateAndFormatFromUrlFile(filepath, fields, jumpFirstLine, dataSeparator)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const businessId = await this.repository.save(companyToken, name, filepath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator)

    var listFieldKey = fields.filter(f => f.key).map(f => f.data)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)

    return { businessId, invalids }
  }

  async createFromJson (companyToken, name, fields, templateId, data, activeUntil, prefixIndexElastic, requestBody, isBatch = true) {
    const { invalids, valids } = await this.validator.validateAndFormatFromJson(data, fields)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    var filename = `${name}.json`
    const filePath = await this.uploader.uploadContent(companyToken, requestBody, filename)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, false, '', isBatch)

    var listFieldKey = fields.filter(f => f.key).map(f => f.data)

    await this.crmService.sendData(valids, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)

    return { businessId, invalids }
  }

  async listAllByTemplateId (companyToken, templateId) {
    try {
      return this.repository.listAllByTemplate(companyToken, templateId)
    } catch (err) {
      return err
    }
  }

  async getByNameAndTemplateId (companyToken, businessName, templateId) {
    try {
      return this.repository.getByNameAndTemplateId(companyToken, businessName, templateId)
    } catch (err) {
      return err
    }
  }

  async getAll (companyToken) {
    try {
      return this.repository.getAll(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllBatches (companyToken) {
    try {
      return this.repository.getAllBatches(companyToken)
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
