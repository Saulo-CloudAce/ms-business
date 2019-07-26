class BusinessRepository {
    constructor (mongodb) {
        this.mongodb = mongodb
    }

    async save (name, filePath, fields, product) {
        return 1;
    }
}

module.exports = BusinessRepository