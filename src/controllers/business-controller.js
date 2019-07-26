const Business = require('../../domain/business')
const BusinessRepository = require('../repository/business-repository')
const Uploader = require('../lib/uploader')
const Validator = require('../lib/validator')

class BusinessController {
    constructor (businessService) {
        this.businessService = businessService
        this.businessRepository = new BusinessRepository(null)
        this.uploader = new Uploader(null)
    }

    async create(req, res) {
        req.assert('name', 'Nome é obrigatório').notEmpty()
        req.assert('file', 'O arquivo é obrigatório').notEmpty()
        req.assert('fields', 'Os campos do arquivo são obrigatórios').isArray()
        req.assert('product', 'Produto é obrigatório').notEmpty()

        if (req.validationErrors()) {
            return res.status(400).send({ errors: req.validationErrors() })
        }

        const newBusiness = new Business(this.businessRepository, this.uploader, new Validator())
        const { businessId, linesInvalid } = await newBusiness.create(req.body.name, req.files.file, req.body.fields, req.body.product)

        return res.status(201).send({ businessId, linesInvalid })
    }
}

module.exports = BusinessController