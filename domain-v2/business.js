import { hasFieldUnique, hasCustomerFields } from '../src-v2/lib/template-validator.js'
import { AggregateModeType } from '../domain-v2/aggregate-mode-enum.js'
import BusinessRepository from '../src-v2/repository/business-repository.js'
import { sendToQueuePostProcess } from '../src-v2/helpers/rabbit-helper.js'

export default class Business {
  constructor(repository = new BusinessRepository(), uploader, validator, crmService) {
    this.repository = repository
    this.uploader = uploader
    this.validator = validator
    this.crmService = crmService
  }

  async create(companyToken, name, file, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator, createdBy = 0, aggregateMode = AggregateModeType.INCREMENT) {
    let listBatches = []
    // if (hasFieldUnique(fields)) {
    //   listBatches = await this.listAllByTemplateId(companyToken, templateId)
    // }

    console.time('validate')
    const { invalids, valids, validsCustomer } = await this.validator.validateAndFormat(file.path, fields, jumpFirstLine, dataSeparator, listBatches)
    console.timeEnd('validate')

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    if (aggregateMode === AggregateModeType.REPLACE) {
      await this.repository.deactivateAllByTemplate(companyToken, templateId)
    }

    const filePath = await this.uploader.upload(file, companyToken)
    console.time('save mongodb')
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator, false, invalids, createdBy, aggregateMode)
    console.timeEnd('save mongodb')

    console.time('send crm')
    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter((f) => f.key).map((f) => f.data)

      this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic, aggregateMode).catch(() => {
        console.log('Errro ao enviar customers para CRM - BUSINESS_ID:', businessId)
      })
    }
    console.timeEnd('send crm')

    return { businessId, invalids }
  }

  async createFromUrlFile(companyToken, name, filepath, fields, templateId, activeUntil, prefixIndexElastic, jumpFirstLine, dataSeparator, createdBy = 0, aggregateMode = AggregateModeType.INCREMENT) {
    const listBatches = []
    // if (hasFieldUnique(fields)) {
    //   listBatches = await this.listAllByTemplateId(companyToken, templateId)
    // }

    const { invalids, valids, validsCustomer, validsPostProcess } = await this.validator.validateAndFormatFromUrlFile(filepath, fields, jumpFirstLine, dataSeparator, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    if (aggregateMode === AggregateModeType.REPLACE) {
      await this.repository.deactivateAllByTemplate(companyToken, templateId)
    }

    const businessId = await this.repository.save(companyToken, name, filepath, templateId, valids.length, valids, activeUntil, jumpFirstLine, dataSeparator, false, invalids, createdBy, aggregateMode)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter((f) => f.key).map((f) => f.data)

      this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic, aggregateMode).catch(() => {
        console.log('Errro ao enviar customers para CRM - BUSINESS_ID:', businessId)
      })
    }

    if (validsPostProcess.length) {
      validsPostProcess.forEach((data) => {
        const obj = {
          data,
          templateId,
          businessId,
          companyToken
        }
        sendToQueuePostProcess(obj)
      })
    }

    return { businessId, invalids }
  }

  async createFromJson(companyToken, name, fields, templateId, data, activeUntil, prefixIndexElastic, requestBody, isBatch = true, createdBy = 0, aggregateMode = AggregateModeType.INCREMENT) {
    let listBatches = []
    // if (hasFieldUnique(fields)) {
    //   listBatches = await this.listAllByTemplateId(companyToken, templateId)
    // }

    const { invalids, valids, validsCustomer, validsPostProcess } = await this.validator.validateAndFormatFromJson(data, fields, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const uploadContentRequestBody = requestBody
    uploadContentRequestBody.invalids = invalids

    if (aggregateMode === AggregateModeType.REPLACE) {
      await this.repository.deactivateAllByTemplate(companyToken, templateId)
    }

    const filename = `${name}.json`
    const filePath = await this.uploader.uploadContent(companyToken, uploadContentRequestBody, filename)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, false, '', isBatch, invalids, createdBy, aggregateMode)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter((f) => f.key).map((f) => f.data)

      this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic, aggregateMode).catch(() => {
        console.log('Errro ao enviar customers para CRM - BUSINESS_ID:', businessId)
      })
    }

    if (validsPostProcess.length) {
      validsPostProcess.forEach((data) => {
        const obj = {
          data,
          templateId,
          businessId,
          companyToken
        }
        sendToQueuePostProcess(obj)
      })
    }

    return { businessId, invalids, valids }
  }

  async createSingleFromJson(companyToken, name, fields, templateId, data, activeUntil, prefixIndexElastic, requestBody, isBatch = true, createdBy = 0, aggregateMode = AggregateModeType.INCREMENT) {
    let listBatches = []
    let contactIdList = []
    // if (hasFieldUnique(fields)) {
    //   listBatches = await this.listAllByTemplateId(companyToken, templateId)
    // }

    const { invalids, valids, validsCustomer, validsPostProcess } = await this.validator.validateAndFormatFromJson(data, fields, listBatches)

    if (valids.length === 0) {
      return { businessId: null, invalids }
    }

    const uploadContentRequestBody = requestBody
    uploadContentRequestBody.invalids = invalids

    const filename = `${name}.json`
    const filePath = await this.uploader.uploadContent(companyToken, uploadContentRequestBody, filename)
    const businessId = await this.repository.save(companyToken, name, filePath, templateId, valids.length, valids, activeUntil, false, '', isBatch, invalids, createdBy, aggregateMode)

    if (hasCustomerFields(fields)) {
      const listFieldKey = fields.filter((f) => f.key).map((f) => f.data)

      const responseSendData = await this.crmService.sendData(validsCustomer, companyToken, businessId, templateId, listFieldKey, prefixIndexElastic, aggregateMode)
      if (responseSendData.data && responseSendData.data.contact_ids) contactIdList = responseSendData.data.contact_ids
    }

    if (validsPostProcess.length) {
      validsPostProcess.forEach((data) => {
        const obj = {
          data,
          templateId,
          businessId,
          companyToken
        }
        sendToQueuePostProcess(obj)
      })
    }

    return { businessId, invalids, contactIds: contactIdList, valids }
  }

  async listAllByTemplateId(companyToken, templateId) {
    try {
      return this.repository.listAllByTemplate(companyToken, templateId)
    } catch (err) {
      return err
    }
  }

  async listAllBatchesAndChildsByTemplateId(companyToken, templateId) {
    try {
      return this.repository.listAllBatchesAndChildsByTemplate(companyToken, templateId)
    } catch (err) {
      return err
    }
  }

  async getByNameAndTemplateId(companyToken, businessName, templateId) {
    try {
      return this.repository.getByNameAndTemplateId(companyToken, businessName, templateId)
    } catch (err) {
      return err
    }
  }

  async getAll(companyToken) {
    try {
      return this.repository.getAll(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllBatches(companyToken) {
    try {
      return this.repository.getAllBatches(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllBatchesBasic(companyToken) {
    try {
      return this.repository.getAllBatchesBasic(companyToken)
    } catch (err) {
      return err
    }
  }

  async getActivatedBatchesBasic(companyToken) {
    try {
      return this.repository.getActivatedBatchesBasic(companyToken)
    } catch (err) {
      return err
    }
  }

  async getAllBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    try {
      return this.repository.getAllBatchesBasicPaginated(companyToken, page, limit)
    } catch (err) {
      return err
    }
  }

  async getAllBasic(companyToken = '') {
    try {
      return this.repository.getAllBasic(companyToken)
    } catch (err) {
      return err
    }
  }

  async getActivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    try {
      return this.repository.getActivatedBatchesBasicPaginated(companyToken, page, limit)
    } catch (err) {
      return err
    }
  }

  async getInactivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    try {
      return this.repository.getInactivatedBatchesBasicPaginated(companyToken, page, limit)
    } catch (err) {
      return err
    }
  }

  async getDataById(companyToken, id) {
    try {
      return this.repository.getDataById(companyToken, id)
    } catch (err) {
      return err
    }
  }

  async getInfoById(companyToken, id) {
    try {
      return this.repository.getInfoById(companyToken, id)
    } catch (err) {
      return err
    }
  }

  async getDataByIdToExport(companyToken, id) {
    try {
      return this.repository.getDataByIdToExport(companyToken, id)
    } catch (err) {
      return err
    }
  }

  async getInvalidsFromBusinessById(companyToken, id) {
    try {
      return this.repository.getInvalidsFromBusinessById(companyToken, id)
    } catch (err) {
      return err
    }
  }

  async getRegisterById(companyToken, businessId, registerId) {
    try {
      return this.repository.getRegisterById(companyToken, businessId, registerId)
    } catch (err) {
      return err
    }
  }

  async getDataByIdPaginated(companyToken, id, page = 0, limit = 10) {
    try {
      return this.repository.getDataByIdPaginated(companyToken, id, page, limit)
    } catch (err) {
      return err
    }
  }

  async getDataByIdPaginatedAndFieldsSelected(companyToken, id, fields, queryPredicate, page = 0, limit = 10) {
    try {
      return this.repository.getDataByIdPaginatedAndFieldsSelected(companyToken, id, fields, queryPredicate, page, limit)
    } catch (err) {
      return err
    }
  }

  async updateDataBusiness(companyToken = '', businessId = '', register = {}, updatedBy = 0) {
    try {
      await this.repository.updateRegisterBusiness(companyToken, register._id, register)
      return this.repository.updateDataBusiness(businessId, updatedBy)
    } catch (err) {
      return err
    }
  }

  async listMailingByTemplateListAndKeySortedReverse(companyToken = '', customer = {}, templateRepository = {}) {
    const mapTemplate = {}
    const templateIdList = []
    const matchParams = []

    try {
      if (!customer.business_template_list) return []

      const templateList = customer.business_template_list

      if (templateList) {
        for (const templateId of templateList) {
          const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
          if (template) {
            const templateFinal = {
              _id: template._id,
              name: template.name,
              lote_data_list: []
            }

            mapTemplate[template._id] = templateFinal
            templateIdList.push(String(template._id))

            const fieldKey = template.fields.find((f) => f.key)
            if (fieldKey) {
              const keyColumn = fieldKey.column

              let keyValue = ''
              if (fieldKey.data === 'customer_cpfcnpj') {
                keyValue = customer.cpfcnpj ? customer.cpfcnpj : customer.customer_cpfcnpj
              } else if (fieldKey.data === 'customer_phone' || fieldKey.data === 'customer_phone_number') {
                keyValue = customer.phone ? customer.phone[0].number : customer.customer_phone ? customer.customer_phone[0].customer_phone_number : customer.custome_phome ? customer.customer_phome[0].number : ''
              } else if (fieldKey.data === 'customer_email' || fieldKey.data === 'customer_email_address') {
                keyValue = customer.email ? customer.email[0].email : customer.customer_email ? customer.customer_email[0].customer_email : ''
              } else if (fieldKey.data === 'customer_name') {
                keyValue = customer.name ? customer.name : customer.customer_name
              }

              const matchp = {}
              matchp[keyColumn] = String(keyValue)
              matchParams.push(matchp)
            }
          }
        }
      }

      if (templateIdList.length && matchParams.length) {
        const customerMailings = await this.repository.listAllByTemplateListAndKeySortedReverse(companyToken, templateIdList, matchParams)
        for (const mailing of customerMailings) {
          if (mapTemplate[mailing.templateId]) {
            mapTemplate[mailing.templateId].lote_data_list.push(mailing)
          }
        }
      }

      return Object.values(mapTemplate)
    } catch (err) {
      console.error(err)
      throw Error('Ocorreu erro ao listar os mailings que tenha este cliente presente')
    }
  }

  async getLastMailingByTemplateListAndKeySortedReverse(companyToken = '', customer = {}, templateRepository = {}) {
    const mapTemplate = {}
    const templateIdList = []
    const matchParams = []

    try {
      if (!customer.business_template_list) return []

      const templateList = customer.business_template_list

      if (templateList) {
        for (const templateId of templateList) {
          const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
          if (template) {
            const templateFinal = {
              _id: template._id,
              name: template.name,
              lote_data_list: []
            }

            mapTemplate[template._id] = templateFinal
            templateIdList.push(String(template._id))

            const fieldKey = template.fields.find((f) => f.key)
            if (fieldKey) {
              const keyColumn = fieldKey.column

              let keyValue = ''
              if (fieldKey.data === 'customer_cpfcnpj') {
                keyValue = customer.cpfcnpj ? customer.cpfcnpj : customer.customer_cpfcnpj
              } else if ((fieldKey.data === 'customer_phone' && customer.phone) || (fieldKey.data === 'customer_phone_number' && customer.customer_phone)) {
                keyValue = customer.phone ? customer.phone[0].number : customer.customer_phone[0].customer_phone_number
              } else if ((fieldKey.data === 'customer_email' && customer.email) || (fieldKey.data === 'customer_email_address' && customer.customer_email)) {
                keyValue = customer.email ? customer.email[0].email : customer.customer_email[0].customer_email
              } else if (fieldKey.data === 'customer_name') {
                keyValue = customer.name ? customer.name : customer.customer_name
              }

              const matchp = {}
              matchp[keyColumn] = String(keyValue)
              matchParams.push(matchp)
            }
          }
        }
      }

      if (templateIdList.length && matchParams.length) {
        const customerMailings = await this.repository.listAllByTemplateListAndKeySortedReverse(companyToken, templateIdList, matchParams)
        if (customerMailings && customerMailings.length && customerMailings[0].templateId) {
          const lastMailing = customerMailings[0]
          mapTemplate[lastMailing.templateId].lote_data_list.push(lastMailing)
        }
      }

      return Object.values(mapTemplate)
    } catch (err) {
      console.error(err)
      throw Error('Ocorreu erro ao listar os mailings que tenha este cliente presente')
    }
  }

  async getLastMailingByCustomerListAndTemplateAndKeySortedReverse(companyToken = '', customers = [], templateId = '', templateRepository = {}) {
    const mapTemplate = {}
    const matchParams = []
    const mapCustomers = {}

    let keyColumn

    try {
      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (template) {
        const fieldKey = template.fields.find((f) => f.key)
        if (fieldKey) {
          keyColumn = fieldKey.column

          for (let customer of customers) {
            let keyValue = ''
            if (fieldKey.data === 'customer_cpfcnpj') {
              keyValue = customer.cpfcnpj ? customer.cpfcnpj : customer.customer_cpfcnpj
            } else if ((fieldKey.data === 'customer_phone' && customer.phone) || (fieldKey.data === 'customer_phone_number' && customer.customer_phone)) {
              keyValue = customer.phone ? customer.phone[0].number : customer.customer_phone[0].customer_phone_number
            } else if ((fieldKey.data === 'customer_email' && customer.email) || (fieldKey.data === 'customer_email_address' && customer.customer_email)) {
              keyValue = customer.email ? customer.email[0].email : customer.customer_email[0].customer_email
            } else if (fieldKey.data === 'customer_name') {
              keyValue = customer.name ? customer.name : customer.customer_name
            }

            const matchp = {}
            matchp[keyColumn] = String(keyValue)
            matchParams.push(matchp)

            customer.schema_list = [
              {
                _id: template._id,
                name: template.name,
                lote_data_list: []
              }
            ]

            mapCustomers[keyValue] = customer
          }
        }
      }

      const templateIdList = [templateId]

      if (templateIdList.length && matchParams.length) {
        const customerMailings = await this.repository.listAllByTemplateListAndKeySortedReverse(companyToken, templateIdList, matchParams)
        for (let mailing of customerMailings) {
          const keyValue = mailing.data[0][keyColumn]
          const cust = mapCustomers[keyValue]
          if (cust && cust.schema_list[0].lote_data_list.length === 0) {
            cust.schema_list[0].lote_data_list.push(mailing)
            mapCustomers[keyValue] = cust
          }
        }
      }

      return Object.values(mapCustomers)
    } catch (err) {
      console.error(err)
      throw Error('Ocorreu erro ao listar os mailings que tenha este cliente presente')
    }
  }
}
