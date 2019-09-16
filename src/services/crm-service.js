const axios = require('axios')

async function sendData (data, companyToken, businessId, templateId, fieldKeyList, prefixIndexElastic) {
  const payload = {
    customers: data,
    business_id: businessId,
    business_template_id: templateId,
    field_key_list: fieldKeyList,
    prefix_index_elastic: prefixIndexElastic
  }

  try {
    await getAxiosInstance(companyToken).post(`${process.env.CRM_URL}/customers`, payload)
  } catch (e) {
    return e
  }
}

async function updateCustomer (customerId, data, companyToken) {
  try {
    return await getAxiosInstance(companyToken).put(`${process.env.CRM_URL}/customers/${customerId}`, data)
  } catch (err) {
    return err
  }
}

async function createSingleCustomer (data, companyToken, prefixIndexElastic) {
  data.prefix_index_elastic = prefixIndexElastic
  try {
    return await getAxiosInstance(companyToken).post(`${process.env.CRM_URL}/customer`, data)
  } catch (err) {
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

async function searchCustomer (search, companyToken, prefixIndexElastic) {
  try {
    return await getAxiosInstanceByCompanyElastic(companyToken, prefixIndexElastic).get(`${process.env.CRM_URL}/customers/search?search=${search}`)
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

function getAxiosInstance (companyToken) {
  return axios.create({
    baseURL: process.env.CRM_URL,
    headers: { 'token' : `${companyToken}` }
  })
}

function getAxiosInstanceByCompanyElastic (companyToken, prefixIndexElastic) {
  return axios.create({
    baseURL: process.env.CRM_URL,
    headers: { 'token' : `${companyToken}`, 'prefix-index-elastic': prefixIndexElastic }
  })
}

module.exports = { sendData, createSingleCustomer, getByCpfCnpj, getAllCustomersByCompany, updateCustomer, searchCustomer, getCustomerById }
