const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

const BYTES_ON_MEGA = 1048576
const LIMIT_SIZE_DOC_BSON_MEGABYTES = 14

class BusinessRepository {
  constructor (db) {
    this.db = db
  }

  _createNewInstance (data = {}) {
    return {
      _id: new ObjectID(),
      companyToken: data.companyToken,
      name: data.name,
      filePath: data.filePath,
      templateId: data.templateId,
      jumpFirstLine: data.jumpFirstLine,
      customerStorage: 'running',
      dataSeparator: data.dataSeparator,
      isBatch: data.isBatch,
      childBatchesId: [],
      quantityRows: 0,
      data: [],
      activeUntil: data.activeUntil,
      invalids: data.invalids,
      flow_passed: false,
      active: true,
      createdAt: moment().format(),
      updatedAt: moment().format()
    }
  }

  _calculateSizeBatch (batch) {
    const sizeBytes = Buffer.byteLength(JSON.stringify(batch), 'utf-8')
    const sizeMegaBytes = (sizeBytes / BYTES_ON_MEGA)
    return sizeMegaBytes
  }

  _splitDataBatch (data, sizeDataMegaBytes) {
    const batches = []
    const quantityParts = Math.ceil(sizeDataMegaBytes / LIMIT_SIZE_DOC_BSON_MEGABYTES)
    const quantityRows = data.data.length
    const quantityRowsByPart = Math.ceil(quantityRows / quantityParts)

    const firstBatch = this._createNewInstance(data)
    firstBatch.data = data.data.splice(0, quantityRowsByPart)
    firstBatch.quantityBatchRows = firstBatch.data.length
    firstBatch.quantityRows = quantityRows
    batches.push(firstBatch)

    for (let i = 0; i < quantityParts - 1; i++) {
      const indexInit = i * quantityRowsByPart
      const indexEnd = indexInit + quantityRowsByPart
      const batch = this._createNewInstance(data)
      const batchData = data.data.slice(indexInit, indexEnd)
      batch.data = batchData
      batch.quantityRows = batch.data.length
      batch.quantityBatchRows = batch.data.length
      batch.parentBatchId = firstBatch._id

      batches[0].childBatchesId.push(batch._id)
      batches.push(batch)
    }

    return batches
  }

  async save (companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil, jumpFirstLine = false, dataSeparator = '', isBatch = true, invalids = []) {
    const data = { _id: new ObjectID(), companyToken, name, filePath, templateId, jumpFirstLine, customerStorage: 'running', dataSeparator, isBatch, quantityRows, data: fieldsData, activeUntil, invalids, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }
    let batches = [data]

    const sizeDataMegaBytes = this._calculateSizeBatch(data)

    if (sizeDataMegaBytes > LIMIT_SIZE_DOC_BSON_MEGABYTES) {
      batches = this._splitDataBatch(data, sizeDataMegaBytes)
    }

    try {
      await this.db.collection('business').insertMany(batches)
      const id = batches[0]._id
      return id
    } catch (err) {
      throw new Error(err)
    }
  }

  async markFlowPassed (companyToken, businessId) {
    try {
      await this.db.collection('business')
        .update({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) }
          ],
          companyToken
        },
        { $set: { flow_passed: true, updatedAt: moment().format() } },
        { multi: true })
    } catch (err) {
      throw new Error(err)
    }
  }

  async unmarkFlowPassed (companyToken, businessId) {
    try {
      await this.db.collection('business')
        .update({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) }
          ],
          companyToken
        },
        { $set: { flow_passed: false, updatedAt: moment().format() } },
        { multi: true })
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateDataBusiness (businessId, data) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { data, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async activate (companyToken, businessId, activeUntil) {
    try {
      await this.db.collection('business')
        .update({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) }
          ],
          companyToken
        },
        { $set: { active: true, activeUntil, updatedAt: moment().format() } },
        { multi: true })
    } catch (err) {
      throw new Error(err)
    }
  }

  async deactivate (companyToken, businessId) {
    try {
      await this.db.collection('business')
        .update({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) }
          ],
          companyToken
        },
        { $set: { active: false, updatedAt: moment().format() } },
        { multi: true })
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByNameAndTemplateId (companyToken, businessName, templateId) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, templateId, name: { $regex: new RegExp(businessName, 'i') } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatches (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatchesBasic (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'quantityRows'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatchesBasicPaginated (companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'quantityRows'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))
      businessList = businessList.slice(skipDocs, (skipDocs + limit))

      const businessListCount = await this.db.collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } }, ['_id'])
        .count()

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: (Math.ceil(parseInt(businessListCount) / limit) - 1)
      }

      return { businessList, pagination }
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllBatchesAndChildsByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'childBatchesId', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()

      let businessChildList = []
      const businessIndexed = {}
      businessList.filter(business => business.childBatchesId && business.childBatchesId.length > 0)
        .forEach(business => {
          businessChildList = businessChildList.concat(business.childBatchesId)
          businessIndexed[business._id] = business
        })

      const businessChildDataList = await this.getChildBatches(businessChildList)
      businessChildDataList.forEach(businessChildData => {
        businessIndexed[businessChildData.parentBatchId].data = businessIndexed[businessChildData.parentBatchId].data.concat(businessChildData.data)
      })

      businessList.filter(business => !business.childBatchesId)
        .forEach(business => { businessIndexed[business._id] = business })

      return Object.values(businessIndexed)
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplateSortedReverse (companyToken, templateId) {
    try {
      let businessList = await this.db.collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()
      businessList = businessList.sort((a, b) => (a.createdAt > b.createdAt) ? -1 : ((b.createdAt > a.createdAt) ? 1 : 0))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateSortedReverse (companyToken, templateId) {
    try {
      let businessList = await this.db.collection('business')
        .find(
          { templateId, companyToken },
          ['_id', 'name', 'data', 'parentBatchId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()
      businessList = businessList.sort((a, b) => (a.createdAt > b.createdAt) ? -1 : ((b.createdAt > a.createdAt) ? 1 : 0))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateAndKeySortedReverse (companyToken, templateId, keyColumn = '', keyValue = '') {
    const matchParams = {}
    matchParams[keyColumn] = keyValue
    try {
      const searchParams = { companyToken, templateId, data: { $elemMatch: matchParams } }

      let businessList = await this.db.collection('business')
        .find(
          searchParams,
          { name: 1, parentBatchId: 1, activeUntil: 1, active: 1, createdAt: 1, updatedAt: 1, flow_passed: 1, data: { $elemMatch: matchParams } })
        .toArray()
      businessList = businessList.sort((a, b) => (a.createdAt > b.createdAt) ? -1 : ((b.createdAt > a.createdAt) ? 1 : 0))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBasicByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, ['_id', 'name', 'activeUntil', 'active', 'createdAt']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById (companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByListId (companyToken, listId) {
    const listIdQuery = listId.map(l => new ObjectID(l))

    try {
      const business = await this.db.collection('business')
        .find({
          companyToken: companyToken,
          $or: [
            { _id: { $in: listIdQuery } },
            { parentBatchId: { $in: listIdQuery } }
          ] })
        .toArray()

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getChildBatches (listChildBatchId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ _id: { $in: listChildBatchId } }, ['_id', 'parentBatchId', 'data'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataById (companyToken, id) {
    try {
      const business = await this.db.collection('business')
        .findOne({ _id: new ObjectID(id), companyToken: companyToken })

      if (business && business.childBatchesId && business.childBatchesId.length > 0) {
        const businessChildList = await this.getChildBatches(business.childBatchesId)
        businessChildList.forEach(businessChild => {
          if (businessChild.parentBatchId.toString() === business._id.toString()) {
            business.data = business.data.concat(businessChild.data)
          }
        })
      }

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByIdPaginated (companyToken, businessId, page = 0, limit = 10) {
    try {
      const skipDocs = page * limit

      const business = await this.db.collection('business')
        .findOne({ _id: new ObjectID(businessId), companyToken: companyToken })

      if (business.childBatchesId) {
        const businessChildBatchesDataList = await this.getChildBatches(business.childBatchesId)
        businessChildBatchesDataList.forEach(businessChildBatchData => {
          business.data = business.data.concat(businessChildBatchData.data)
        })
      }

      business.data = business.data.slice(skipDocs, (skipDocs + limit))

      if (business) {
        delete business.childBatchesId

        business.dataPagination = {
          numRows: business.quantityRows,
          page,
          firstPage: 0,
          lastPage: (Math.ceil(parseInt(business.quantityRows) / limit) - 1)
        }
      }

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByIdAndChildReference (companyToken, businessId) {
    try {
      const businessList = await this.db.collection('business')
        .find({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) }
          ],
          companyToken })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getExpiredBusiness (date) {
    try {
      const businessList = await this.db.collection('business').find({ activeUntil: date, active: true }, ['_id']).toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = BusinessRepository
