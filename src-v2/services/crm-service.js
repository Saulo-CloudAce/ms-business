const axios = require('axios')

async function sendData (data, companyToken, businessId, templateId, fieldKeyList, prefixIndexElastic) {
  const payload = {
    customers: data,
    business_id: businessId,
    business_template_id: templateId,
    field_key_list: fieldKeyList,
    prefix_index_elastic: prefixIndexElastic
  }

  // try {
  const result = await getAxiosInstance(companyToken).post(`${process.env.CRM_URL}/customers`, payload)
  return result
  // } catch (err) {
  //   console.error('SEND DATA CRM ==>', err)
  //   return err
  // }
}

async function updateCustomer (customerId, data, companyToken) {
  try {
    return await getAxiosInstance(companyToken).put(`${process.env.CRM_URL}/customers/${customerId}`, data)
  } catch (err) {
    console.error('UPDATE CUSTOMER CRM ==>', err)
    return err
  }
}

async function createSingleCustomer (data, companyToken, prefixIndexElastic) {
  try {
    data.prefix_index_elastic = prefixIndexElastic
    return await getAxiosInstance(companyToken).post(`${process.env.CRM_URL}/customer`, data)
  } catch (err) {
    console.error('CREATE SINGLE CUSTOMER CRM ==>', err)
    return err
  }
}

async function getByCpfCnpj (cpfcnpj, companyToken) {
  try {
    return await getAxiosInstance(companyToken).get(`${process.env.CRM_URL}/customers?cpfcnpj=${cpfcnpj}`)
  } catch (err) {
    return err
  }
}

async function getCustomerById (id, companyToken) {
  try {
    return await getAxiosInstance(companyToken).get(`${process.env.CRM_URL}/customers/${id}`)
  } catch (err) {
    return err
  }
}

async function getCustomerFormattedById (id, companyToken) {
  try {
    return await getAxiosInstance(companyToken).get(`${process.env.CRM_URL}/customers/${id}/formatted`)
  } catch (err) {
    return err
  }
}

async function searchCustomer (search, companyToken, prefixIndexElastic) {
  try {
    return await getAxiosInstanceByCompanyElastic(companyToken, prefixIndexElastic).get(`${process.env.CRM_URL}/customers/search?search=${search}`)
  } catch (err) {
    return err
  }
}

async function searchCustomerFormatted (search, companyToken, prefixIndexElastic, page = 0, limit = 10) {
  try {
    return await getAxiosInstanceByCompanyElastic(companyToken, prefixIndexElastic).get(`${process.env.CRM_URL}/customers/search/formatted?search=${search}&page=${page}&limit=${limit}`)
  } catch (err) {
    return err
  }
}

async function getAllCustomersByCompany (companyToken) {
  try {
    return await getAxiosInstance(companyToken).get(`${process.env.CRM_URL}/customers/all`)
  } catch (err) {
    return err
  }
}

async function getAllCustomersByCompanyPaginated (companyToken, page = 0, limit = 0) {
  try {
    return await getAxiosInstance(companyToken).get(`${process.env.CRM_URL}/customers/all?page=${page}&limit=${limit}`)
  } catch (err) {
    return err
  }
}

function getAxiosInstance (companyToken) {
  return axios.create({
    baseURL: process.env.CRM_URL,
    headers: { token: `${companyToken}` },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 0
  })
}

function getAxiosInstanceByCompanyElastic (companyToken, prefixIndexElastic) {
  return axios.create({
    baseURL: process.env.CRM_URL,
    headers: { token: `${companyToken}` },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 0
  })
}

module.exports = {
  sendData,
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  updateCustomer,
  searchCustomer,
  searchCustomerFormatted,
  getCustomerById,
  getCustomerFormattedById,
  getAllCustomersByCompanyPaginated
}
