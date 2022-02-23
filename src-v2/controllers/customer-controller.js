import moment from 'moment'
import {
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  searchCustomer,
  searchCustomerFormatted,
  updateCustomer,
  getCustomerById,
  getCustomerFormattedById,
  getAllCustomersByCompanyPaginated,
  getListCustomersByCpfCnpj
} from '../services/crm-service.js'
import { clearCPFCNPJ } from '../helpers/formatters.js'
import { normalizeArraySubfields } from '../lib/data-transform.js'
import { calcExpireTime } from '../helpers/util.js'
import CompanyRepository from '../repository/company-repository.js'
import TemplateRepository from '../repository/template-repository.js'
import BusinessRepository from '../repository/business-repository.js'
import Business from '../../domain-v2/business.js'

export default class CustomerController {
  _getInstanceRepositories(app) {
    const businessRepository = new BusinessRepository(app.locals.db)
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)

    return { businessRepository, companyRepository, templateRepository }
  }

  async create(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const cpfcnpj = clearCPFCNPJ(req.body.customer_cpfcnpj)
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await createSingleCustomer(req.body, companyToken, company.prefix_index_elastic)
      if (request.response && request.response.status && request.response.status !== 200)
        return res.status(request.response.status).send(request.response.data)
      return res.status(201).send(request.data)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async update(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const cpfcnpj = clearCPFCNPJ(req.body.customer_cpfcnpj)
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await updateCustomer(req.params.id, req.body, companyToken)
      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)
      return res.status(200).send(request.data)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async getById(req, res) {
    const companyToken = req.headers['token']
    const customerId = req.params.id

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      if (global.cache.customers[customerId]) {
        const customerCached = global.cache.customers[customerId]
        if (customerCached && customerCached.expire && calcExpireTime(new Date(), customerCached.expire) < global.cache.default_expire) {
          console.log('CUSTOMER_CACHED')
          return res.status(200).send(customerCached.data)
        } else {
          global.cache.customers[customerId] = null
        }
      }

      const customer = request.data

      if (customer) {
        const mailings = await businessDomain.listMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)

        customer.schema_list = mailings
        delete customer.business_list
        delete customer.business_template_list
      }

      console.log('CUSTOMER_STORED')
      global.cache.customers[customerId] = { data: customer, expire: new Date() }

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o cliente' })
    }
  }

  async getByIdAndTemplateId(req, res) {
    const companyToken = req.headers['token']
    const customerId = req.params.id
    const templateId = req.params.templateId
    if (!customerId) return res.status(400).send({ error: 'Informe o ID do customer.' })
    if (!templateId) return res.status(400).send({ error: 'Informe o ID do template.' })

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerById(customerId, companyToken)

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      const customer = request.data
      const templateList = customer.business_template_list
      if (!templateList || !Array.isArray(templateList)) {
        return res.status(404).send({ error: 'Este customer não está vinculado a um mailing.' })
      }
      const hasTemplate = templateList.find((tl) => tl === templateId)
      if (!hasTemplate) {
        return res.status(404).send({ error: 'Este customer não está vinculado a um mailing do template informado.' })
      }

      // Fixa o ID do template procurado, já que este cliente tem vínculo com este template
      customer.business_template_list = [templateId]

      if (customer) {
        const mailings = await businessDomain.getLastMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)
        customer.schema_list = mailings
        delete customer.business_list
        delete customer.business_template_list
      }

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Erro ao buscar o ' })
    }
  }

  async getByIdFormatted(req, res) {
    const companyToken = req.headers['token']
    const customerId = req.params.id

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerFormattedById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      if (global.cache.customers_formatted[customerId]) {
        const customerCached = global.cache.customers_formatted[customerId]
        if (customerCached && customerCached.expire && calcExpireTime(new Date(), customerCached.expire) < global.cache.default_expire) {
          console.log('CUSTOMER_FORMATTED_CACHED')
          return res.status(200).send(customerCached.data)
        } else {
          global.cache.customers_formatted[customerId] = null
        }
      }

      const customer = request.data
      if (customer) {
        const mailings = await businessDomain.listMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)

        customer.schema_list = mailings
        delete customer.business_list
        delete customer.business_template_list
      }

      console.log('CUSTOMER_FORMATTED_CACHED')
      global.cache.customers_formatted[customerId] = { data: customer, expire: new Date() }

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o cliente.' })
    }
  }

  async getByIdAndTemplateIdFormatted(req, res) {
    const companyToken = req.headers['token']
    const customerId = req.params.id
    const templateId = req.params.templateId

    if (!customerId) return res.status(400).send({ error: 'Informe o ID do customer.' })
    if (!templateId) return res.status(400).send({ error: 'Informe o ID do template.' })

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerFormattedById(customerId, companyToken)

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      const customer = request.data
      const templateList = customer.business_template_list
      if (!templateList || !Array.isArray(templateList)) {
        return res.status(404).send({ error: 'Este customer não está vinculado a um mailing.' })
      }
      const hasTemplate = templateList.find((tl) => tl === templateId)
      if (!hasTemplate) {
        return res.status(404).send({ error: 'Este customer não está vinculado a um mailing do template informado.' })
      }

      customer.business_template_list = [templateId]

      // let templateFinal = {}
      // const template = await templateRepository.getById(templateId, companyToken)
      // if (template) {
      //   templateFinal = { _id: template._id, name: template.name }
      //   const fieldKey = template.fields.find(f => f.key)
      //   if (fieldKey) {
      //     const keyColumn = fieldKey.column

      //     let keyValue = ''
      //     if (fieldKey.data === 'customer_cpfcnpj') {
      //       keyValue = (customer.cpfcnpj) ? customer.cpfcnpj : customer.customer_cpfcnpj
      //     } else if (fieldKey.data === 'customer_phone' || fieldKey.data === 'customer_phone_number') {
      //       keyValue = (customer.phone) ? customer.phone[0].number : customer.customer_phome[0].number
      //     } else if (fieldKey.data === 'customer_email' || fieldKey.data === 'customer_email_address') {
      //       keyValue = (customer.email) ? customer.email[0].email : customer.customer_email[0].email
      //     } else if (fieldKey.data === 'customer_name') {
      //       keyValue = (customer.name) ? customer.name : customer.customer_name
      //     }

      //     let templateData = await businessRepository.getLastByTemplateAndKeySortedReverse(companyToken, templateId, [keyColumn], keyValue)

      //     if (templateData.length) {
      //       templateData = normalizeArraySubfields(templateData, template)
      //       templateFinal.lote_data_list = templateData
      //     }
      //   }
      // }

      if (customer) {
        const mailings = await businessDomain.getLastMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)

        customer.schema_list = mailings
        delete customer.business_list
        delete customer.business_template_list
      }

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o cliente' })
    }
  }

  async getCustomerInfoByCpfCnpj(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      let cpfcnpj = req.query.cpfcnpj
      let request = null
      if (cpfcnpj) {
        cpfcnpj = clearCPFCNPJ(cpfcnpj)
        request = await getByCpfCnpj(cpfcnpj, companyToken)
      } else {
        request = await getAllCustomersByCompany(companyToken)
      }

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      const customer = request.data ? request.data : {}
      if (customer) return res.status(200).send(customer)
      return res.status(404).send()
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getCustomerPoolInfoByCpfCnpj(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      let cpfcnpjList = req.body.cpfcnpj_list

      cpfcnpjList = cpfcnpjList.map((cpfcnpj) => {
        return clearCPFCNPJ(cpfcnpj)
      })
      const request = await getListCustomersByCpfCnpj(cpfcnpjList, companyToken)

      if (request.response && request.response.status && request.response.status !== 200)
        return res.status(request.response.status).send(request.response.data)

      const customers = request.data ? request.data : []
      if (customers) return res.status(200).send(customers)
      return res.status(404).send()
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getByCpfCnpj(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      let cpfcnpj = req.query.cpfcnpj
      let request = null
      if (cpfcnpj) {
        cpfcnpj = clearCPFCNPJ(cpfcnpj)
        request = await getByCpfCnpj(cpfcnpj, companyToken)
      } else {
        request = await getAllCustomersByCompany(companyToken)
      }

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      console.time('format data')
      const customer = request.data ? request.data : []
      const templateList = customer && customer.business_template_list ? customer.business_template_list : []
      let templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(
          templateList.map(async (templateId) => {
            const template = await templateRepository.getById(templateId, companyToken)
            if (template) {
              const templateFinal = { _id: template._id, name: template.name, updatedAt: template.updatedAt }
              let templateData = []
              const fieldKey = template.fields.find((f) => f.data === 'customer_cpfcnpj')

              if (fieldKey) {
                const keyCpfCnpj = fieldKey.column
                let data = []
                if (cpfcnpj) {
                  templateData = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(
                    companyToken,
                    templateId,
                    [keyCpfCnpj],
                    cpfcnpj
                  )
                } else {
                  console.log('aaa')
                  data = await businessRepository.listAllAndChildsByTemplateSortedReverse(companyToken, templateId)

                  data = data.filter((d) => d.data)
                  if (data && data.length > 0) {
                    data.map((m) => {
                      m.data = m.data.filter((md) => md[keyCpfCnpj] === cpfcnpj)
                      if (m.parentBatchId) {
                        m._id = m.parentBatchId
                        delete m.parentBatchId
                      }
                    })
                  }

                  templateData = data
                }

                if (templateData.length > 0) {
                  templateData = normalizeArraySubfields(templateData, template)
                  templateFinal.lote_data_list = templateData
                  return templateFinal
                }
              }
            }
          })
        )
      }
      console.timeEnd('format data')

      customer.schema_list = templates.filter((t) => t).sort((a, b) => moment(b.updatedAt) - moment(a.updatedAt))
      delete customer.business_list
      delete customer.business_template_list

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getAllByCompanyPaginated(req, res) {
    const companyToken = req.headers.token
    const templateId = req.headers.templateid ? req.headers.templateid : ''
    let page = 0
    let limit = 10
    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      var { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      console.time('lista customers')
      const request = await getAllCustomersByCompanyPaginated(companyToken, page, limit, templateId)
      console.timeEnd('lista customers')

      if (request.response && request.response.status && request.response.status != 200)
        return res.status(request.response.status).send(request.response.data)

      return res.status(200).send(request.data)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async search(req, res) {
    const companyToken = req.headers['token']
    const queryTemplateId = req.headers['templateid']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const search = req.query.search
      console.time('searchCustomer')
      const request = await searchCustomer(search, companyToken, company.prefix_index_elastic, queryTemplateId)
      console.timeEnd('searchCustomer')

      if (request.response && request.response.status && request.response.status !== 200)
        return res.status(request.response.status).send(request.response.data)
      let customers = Array.isArray(request.data) ? request.data : []

      if (queryTemplateId && String(queryTemplateId).length > 0) {
        customers = customers.filter((c) => c.business_template_list && c.business_template_list.indexOf(queryTemplateId) >= 0)
      }

      let customerResultList = []

      console.time('searchMongo')
      for (const customer of customers) {
        const mailings = await businessDomain.listMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)

        const customerResult = {
          id: customer.id,
          customer_name: customer.customer_name,
          customer_cpfcnpj: customer.customer_cpfcnpj,
          customer_phome: customer.customer_phome,
          customer_email: customer.customer_email,
          schema_list: mailings
        }

        customerResultList.push(customerResult)
      }
      console.timeEnd('searchMongo')

      customerResultList = customerResultList.sort((a, b) =>
        a.customer_name > b.customer_name ? 1 : b.customer_name > a.customer_name ? -1 : 0
      )

      return res.status(200).send(customerResultList)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async searchPaginated(req, res) {
    const companyToken = req.headers['token']
    const queryTemplateId = req.headers['templateid']

    let page = 0
    let limit = 10
    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const search = req.query.search
      console.time('search customer on CRM')
      const request = await searchCustomerFormatted(search, companyToken, company.prefix_index_elastic, queryTemplateId, page, limit)
      console.timeEnd('search customer on CRM')

      if (request.response && request.response.status && request.response.status !== 200)
        return res.status(request.response.status).send(request.response.data)
      let customers = Array.isArray(request.data.customers) ? request.data.customers : []
      const customersPagination = request.data.pagination

      if (queryTemplateId && String(queryTemplateId).length > 0) {
        customers = customers.filter((c) => c.business_template_list && c.business_template_list.indexOf(queryTemplateId) >= 0)
      }

      let customerResultList = []

      for (const customer of customers) {
        const mailings = await businessDomain.listMailingByTemplateListAndKeySortedReverse(companyToken, customer, templateRepository)

        const customerResult = {
          id: customer.id,
          name: customer.name,
          cpfcnpj: customer.cpfcnpj,
          phone: customer.phone,
          email: customer.email,
          schema_list: mailings
        }

        customerResultList.push(customerResult)
      }

      customerResultList = customerResultList.sort((a, b) =>
        a.customer_name > b.customer_name ? 1 : b.customer_name > a.customer_name ? -1 : 0
      )

      return res.status(200).send({ customers: customerResultList, pagination: customersPagination })
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }
}
