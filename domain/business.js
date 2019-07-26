class Business {
    constructor (repository, uploader, validator) {
        this.repository = repository
        this.uploader = uploader
        this.validator = validator
    }

    async create(name, file, fields, product) {
        const filePath = await this.uploader.upload(file)
        const { resultInvalid, resultValid } = await this.validator.validate(filePath, fields)
        const businessId = await this.repository.save(name, filePath, fields, product)
        return { businessId, resultInvalid }
    }
}

module.exports = Business