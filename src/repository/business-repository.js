class BusinessRepository {
  constructor (mongodb) {
    this.mongodb = mongodb
  }

  async save (name, filePath, fields, product, quantityRows) {
    const data = { name, filePath, fields, product, quantityRows }

    try {
      const db = await this.mongodb.connect()
      var r = await db.collection(process.env.MONGO_COLLECTION).insertOne(data)

      return r.insertedId
    } catch (e) {
      console.log(e)
      return new Error(e.toString())
    }
  }
}

module.exports = BusinessRepository
