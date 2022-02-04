class QueryPredicateError extends Error {
  constructor(message = '') {
    super()
    this.message = message
  }
}

module.exports = QueryPredicateError
