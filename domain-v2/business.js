const { hasFieldUnique, hasCustomerFields } = require('../src/lib/template-validator')

class Business {
  constructor (repository, uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create (companyToken, name, file, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator) {
    let listBatches = []
    if (hasFieldUnique(fields)) {
      listBatches = await this.listAllByTemplateId(companyToken, templateId)
    }

    const { invalids, valids, validsCustomer } = await this.validator.validateAndFormat(file.path, fields, jumpFirstLine, dataSeparator, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const filePath = await this.uploader.upload(file)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator, false, invalids)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter(f => f.key).map(f => f.data)

      await this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)
    }

    return { businessId, invalids }
  }

  async createFromUrlFile (companyToken, name, filepath, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator) {
    let listBatches = []
    if (hasFieldUnique(fields)) {
      listBatches = await this.listAllByTemplateId(companyToken, templateId)
    }

    const { invalids, valids, validsCustomer } = await this.validator.validateAndFormatFromUrlFile(filepath, fields, jumpFirstLine, dataSeparator, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const businessId = await this.repository.save(companyToken, name, filepath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator, false, invalids)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter(f => f.key).map(f => f.data)

      await this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)
    }

    return { businessId, invalids }
  }

  async createFromJson (companyToken, name, fields, templateId, data, activeUntil, prefixIndexElastic, requestBody, isBatch = true) {
    let listBatches = []
    let contactIdList = []
    if (hasFieldUnique(fields)) {
      listBatches = await this.listAllByTemplateId(companyToken, templateId)
    }

    const { invalids, valids, validsCustomer } = await this.validator.validateAndFormatFromJson(data, fields, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const uploadContentRequestBody = requestBody
    uploadContentRequestBody.invalids = invalids

    const filename = `${name}.json`
    const filePath = await this.uploader.uploadContent(companyToken, uploadContentRequestBody, filename)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, false, '', isBatch, invalids)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter(f => f.key).map(f => f.data)

      const responseSendData = await this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic)
      if (responseSendData.data && responseSendData.data.contact_ids) contactIdList = responseSendData.data.contact_ids
    }

    return { businessId, invalids, contactIds: contactIdList, valids }
  }

  async listAllByTemplateId (companyToken, templateId) {
    try {
      return this.repository.listAllByTemplate(companyToken, templateId)
    } catch (err) {
      return err
    }
  }

  async listAllBatchesAndChildsByTemplateId (companyToken, templateId) {
    try {
      return this.repository.listAllBatchesAndChildsByTemplate(companyToken, templateId)
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

  async getAllBatchesBasic (companyToken) {
    try {
      return this.repository.getAllBatchesBasic(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllBatchesBasicPaginated (companyToken, page = 0, limit = 10) {
    try {
      return this.repository.getAllBatchesBasicPaginated(companyToken, page, limit)
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

  async getDataByIdPaginated (companyToken, id, page = 0, limit = 10) {
    try {
      return this.repository.getDataByIdPaginated(companyToken, id, page, limit)
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
