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
    // const data = { companyToken, name, filePath, templateId, jumpFirstLine, customerStorage: 'running', dataSeparator, isBatch, quantityRows, data: fieldsData, activeUntil, invalids, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }

    // try {
    //   var r = await this.db.collection('business').insertOne(data)
    //   const id = r.insertedId
    //   return id
    // } catch (err) {
    //   throw new Error(err)
    // }

    const data = { _id: new ObjectID(), companyToken, name, filePath, templateId, jumpFirstLine, customerStorage: 'running', dataSeparator, isBatch, quantityRows, data: fieldsData, activeUntil, invalids, flow_passed: false, active: true, createdAt: moment().format(), updatedAt: moment().format() }
    let batches = [data]

    console.time('calculate')
    const sizeDataMegaBytes = this._calculateSizeBatch(data)
    console.timeEnd('calculate')

    if (sizeDataMegaBytes > LIMIT_SIZE_DOC_BSON_MEGABYTES) {
      console.time('split')
      batches = this._splitDataBatch(data, sizeDataMegaBytes)
      console.timeEnd('split')
    }

    try {
      await this.db.collection('business').insertMany(batches)
      const id = batches[0]._id
      return id
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateCustomerStorageStatus (businessId, status) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { customerStorage: status, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async markFlowPassed (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: true, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async unmarkFlowPassed (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { flow_passed: false, updatedAt: moment().format() } })
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

  async activate (businessId, activeUntil) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: true, activeUntil, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async deactivate (businessId) {
    try {
      await this.db.collection('business').update({ _id: new ObjectID(businessId) }, { $set: { active: false, updatedAt: moment().format() } })
    } catch (err) {
      throw new Error(err)
    }
  }

  async getByNameAndTemplateId (companyToken, businessName, templateId) {
    try {
      const businessList = await this.db.collection('business')
        .find({ companyToken: companyToken, templateId, name: { $regex: new RegExp(businessName, 'i') } }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt'])
        .sort({ createdAt: -1 })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll (companyToken) {
    try {
      let businessList = await this.db.collection('business')
        .find({ companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'data'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatches (companyToken) {
    try {
      const businessList = await this.db.collection('business')
        .aggregate([
          { $match: { companyToken: companyToken } },
          {
            $project: {
              _id: '$_id',
              name: '$name',
              templateId: '$templateId',
              activeUntil: '$activeUntil',
              active: '$active',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
              dataAmount: { $size: '$data' }
            }
          }
        ])
        .sort({ createdAt: -1 })
        .toArray()
      return businessList
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async listAllByTemplate (companyToken = '', templateId = '', flowPassed = '') {
    try {
      const filter = { templateId, companyToken }

      if (flowPassed !== '') {
        filter['flow_passed'] = flowPassed
      }

      const businessList = await this.db.collection('business')
        .find(filter, ['_id', 'name', 'data', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'flow_passed', 'activeUntil', 'active'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateAndKeySortedReverse (companyToken, templateId, keyColumn = '', keyValue = '') {
    const businessList = []

    const matchParams = {}
    matchParams[keyColumn] = keyValue
    try {
      const searchParams = { companyToken, templateId, data: { $elemMatch: matchParams } }

      let businessListStored = await this.db.collection('business')
        .find(
          searchParams,
          { name: 1, parentBatchId: 1, activeUntil: 1, active: 1, createdAt: 1, updatedAt: 1, flow_passed: 1, data: { $elemMatch: matchParams } })
        .toArray()
      businessListStored = businessListStored.sort((a, b) => (a.createdAt > b.createdAt) ? -1 : ((b.createdAt > a.createdAt) ? 1 : 0))

      for (const i in businessListStored) {
        const bData = businessListStored[i]
        businessList.push({
          _id: (bData.parentBatchId) ? bData.parentBatchId : bData._id,
          name: bData.name,
          data: bData.data,
          activeUntil: bData.activeUntil,
          flow_passed: bData.flow_passed,
          active: bData.active,
          createdAt: bData.createdAt,
          updatedAt: bData.updatedAt
        })
      }

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBasicByTemplate (companyToken, templateId) {
    try {
      const businessList = await this.db.collection('business').find({ templateId, companyToken }, ['_id', 'name', 'activeUntil', 'active', 'createdAt']).toArray()

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
    var listIdQuery = listId.map(l => new ObjectID(l))
    try {
      const business = await this.db.collection('business').find({ companyToken: companyToken, _id: { $in: listIdQuery } }).toArray()

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataById (companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectID(id), companyToken: companyToken })

      return business
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

  async getDataByIdPaginated (companyToken, businessId, page = 0, limit = 10) {
    try {
      const skipDocs = page * limit

      const business = await this.db.collection('business')
        .findOne({ _id: new ObjectID(businessId), companyToken: companyToken })

      if (business.childBatchesId) {
        const businessChildBatchesDataList = await this.getChildBatches([new ObjectID(businessId)])
        for (const i in businessChildBatchesDataList) {
          const businessChildBatchData = businessChildBatchesDataList[i]
          business.data.push(...businessChildBatchData.data)
        }
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

  async getChildBatches (listParentBatchId = []) {
    try {
      const businessList = await this.db.collection('business')
        .find({ parentBatchId: { $in: listParentBatchId } }, ['_id', 'parentBatchId', 'data'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }
}

module.exports = BusinessRepository
