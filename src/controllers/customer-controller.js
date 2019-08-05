class CustomerController {
  async listBusiness (req, res) {
    var cpfcnpj = req.query.cpfcnpj
    cpfcnpj = cpfcnpj.replace(/\./g, '')
    cpfcnpj = cpfcnpj.replace(/\\/g, '')
    cpfcnpj = cpfcnpj.replace(/-/g, '')

    try {

    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }
}

module.exports = CustomerController
