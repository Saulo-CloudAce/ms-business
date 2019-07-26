const axios = require('axios')

async function sendData (data, businessId) {
  const payload = {
    business_id: businessId,
    customers: data,
    user_id: 1
  }
  try {
    await axios.post(`${process.env.CRM_URL}/customers`, payload)
  } catch (e) {
    return new Error(e)
  }
}

module.exports = { sendData }
