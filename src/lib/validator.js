class Validator {

    async validate(filePath, fields) {
        return {
            invalid: [],
            valid: []
        }
    }

}

module.exports = Validator