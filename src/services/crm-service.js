const axios = require('axios')

async function sendData (data, companyToken, businessId) {
  const payload = {
    business_id: businessId,
    customers: data
  }
  try {
    await getAxiosInstance(companyToken).post(`${process.env.CRM_URL}/customers`, payload)
  } catch (e) {
    return e
  }
}

function getAxiosInstance (companyToken) {
  return axios.create({
    baseURL: process.env.CRM_URL,
    headers: { 'company_token' : `${companyToken}` }
  })
}

module.exports = { sendData }
