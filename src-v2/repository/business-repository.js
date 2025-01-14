import { ObjectId } from 'mongodb'
import moment from 'moment'

import { AggregateModeType } from '../../domain-v2/aggregate-mode-enum.js'
import QueryPredicate from './query-predicate.js'
import CacheService from '../services/cache-service.js'

export default class BusinessRepository {
  constructor(db = {}, cacheService = new CacheService()) {
    this.db = db
    this.cacheService = cacheService
  }

  async save(companyToken, name, filePath, templateId, quantityRows, fieldsData, activeUntil, jumpFirstLine = false, dataSeparator = '', isBatch = true, invalids = [], createdBy = 0, aggregateMode = AggregateModeType.INCREMENT) {
    const business = {
      _id: new ObjectId(),
      companyToken,
      name,
      filePath,
      templateId,
      jumpFirstLine,
      customerStorage: 'running',
      dataSeparator,
      isBatch,
      quantityRows,
      activeUntil,
      invalids,
      flowPassed: false,
      active: true,
      createdAt: moment().format(),
      updatedAt: moment().format(),
      createdBy,
      updatedBy: createdBy,
      aggregateMode
    }
    const batches = [business]

    const businessData = fieldsData.map((f) => {
      f.businessId = business._id
      f.templateId = business.templateId
      f.companyToken = business.companyToken
      f.businessCreatedAt = business.createdAt
      f.businessUpdatedAt = business.updatedAt

      return f
    })

    try {
      await this.db.collection('business').insertMany(batches)
      await this.db.collection('business_data').insertMany(businessData)

      await this.cacheService.removeBusinessActivePaginatedList(business.companyToken)
      await this.cacheService.removeChildByTemplate(business.companyToken, business.templateId)
      await this.cacheService.removeAllBusinessActivatedList(business.companyToken)
      await this.cacheService.removeBusinessActiveListByTemplate(business.companyToken, business.templateId)

      return business._id
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async markFlowPassed(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = {
        flowPassed: true,
        updatedAt: moment().format(),
        updatedBy
      }
      await this.db.collection('business').update(
        {
          $or: [
            { _id: new ObjectId(businessId) },
            {
              parentBatchId: new ObjectId(businessId)
            }
          ],
          companyToken
        },
        { $set: businessUpdated },
        { multi: true }
      )

      await this.cacheService.removeAllBusinessActivatedList(companyToken)
    } catch (err) {
      throw new Error(err)
    }
  }

  async unmarkFlowPassed(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = {
        flowPassed: false,
        updatedAt: moment().format(),
        updatedBy
      }
      await this.db.collection('business').update(
        {
          $or: [
            { _id: new ObjectId(businessId) },
            {
              parentBatchId: new ObjectId(businessId)
            }
          ],
          companyToken
        },
        { $set: businessUpdated },
        { multi: true }
      )

      await this.cacheService.removeAllBusinessActivatedList(companyToken)
    } catch (err) {
      throw new Error(err)
    }
  }

  async updateAllRegisterBusiness(companyToken = '', registerId = '', data = {}) {
    try {
      await this.db.collection('business_data').updateOne({ _id: registerId }, { $set: data })

      await this.cacheService.removeBusinessRegister(companyToken, registerId)
      await this.cacheService.removeAllCustomerFormatted(companyToken)
      await this.cacheService.removeAllCustomer(companyToken)
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async updateRegisterBusiness(companyToken = '', registerId, data = {}) {
    try {
      await this.db.collection('business_data').updateOne(
        { _id: registerId },
        {
          $set: data
        }
      )

      await this.cacheService.removeBusinessRegister(companyToken, registerId)
      await this.cacheService.removeAllCustomerFormatted(companyToken)
      await this.cacheService.removeAllCustomer(companyToken)
      console.log('BUSINESS_REGISTER_CACHE_INVALIDATED')
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async updateDataBusiness(businessId, updatedBy = 0) {
    try {
      const businessUpdated = { updatedAt: moment().format(), updatedBy }
      await this.db.collection('business').updateOne(
        {
          _id: new ObjectId(businessId)
        },
        { $set: businessUpdated }
      )
    } catch (err) {
      throw new Error(err)
    }
  }

  async activate(companyToken, businessId, activeUntil, updatedBy = 0) {
    try {
      const businessUpdated = {
        active: true,
        activeUntil,
        updatedAt: moment().format(),
        updatedBy
      }
      await this.db.collection('business').update(
        {
          $or: [
            { _id: new ObjectId(businessId) },
            {
              parentBatchId: new ObjectId(businessId)
            }
          ],
          companyToken
        },
        { $set: businessUpdated },
        { multi: true }
      )

      await this.cacheService.removeBusinessActivePaginatedList(companyToken)
      await this.cacheService.removeAllCustomer(companyToken)
      await this.cacheService.removeAllCustomerFormatted(companyToken)
      await this.cacheService.removeAllBusinessActivatedList(companyToken)
      await this.cacheService.removeAllBusinessActiveList(companyToken)
    } catch (err) {
      throw new Error(err)
    }
  }

  async deactivate(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = {
        active: false,
        updatedAt: moment().format(),
        updatedBy
      }
      await this.db.collection('business').update(
        {
          $or: [
            { _id: new ObjectId(businessId) },
            {
              parentBatchId: new ObjectId(businessId)
            }
          ],
          companyToken
        },
        { $set: businessUpdated },
        { multi: true }
      )

      await this.cacheService.removeBusinessActivePaginatedList(companyToken)
      await this.cacheService.removeAllCustomer(companyToken)
      await this.cacheService.removeAllCustomerFormatted(companyToken)
      await this.cacheService.removeAllBusinessActivatedList(companyToken)
      await this.cacheService.removeAllBusinessActiveList(companyToken)
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async deactivateAllByTemplate(companyToken, templateId, updatedBy = 0) {
    try {
      const businessUpdated = {
        active: false,
        updatedAt: moment().format(),
        updatedBy
      }
      await this.db.collection('business').update(
        {
          templateId,
          companyToken,
          active: true
        },
        { $set: businessUpdated },
        { multi: true }
      )

      await this.cacheService.removeBusinessActivePaginatedList(companyToken)
      await this.cacheService.removeAllCustomer(companyToken)
      await this.cacheService.removeAllCustomerFormatted(companyToken)
      await this.cacheService.removeAllBusinessActivatedList(companyToken)
      await this.cacheService.removeBusinessActiveListByTemplate(companyToken, templateId)
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getByNameAndTemplateId(companyToken, businessName, templateId) {
    try {
      let businessList = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          templateId,
          name: businessName
        })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'flowPassed'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAll(companyToken) {
    try {
      let businessList = await this.db
        .collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'flowPassed'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatches(companyToken) {
    try {
      let businessList = await this.db
        .collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'flowPassed'])
        .toArray()

      businessList = businessList.sort((a, b) => moment(b.createdAt) - moment(a.createdAt))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatchesBasic(companyToken) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'quantityRows', 'flowPassed'])
        .limit(10)
        .sort({ createdAt: -1 })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getActivatedBatchesBasic(companyToken) {
    try {
      const allActivated = await this.cacheService.getAllBusinessActivatedList(companyToken)
      if (allActivated) {
        console.log('ALL_BUSINESS_ACTIVATED_CACHED')
        return allActivated
      }

      console.time('getActivatedBatchesBasic')
      const businessList = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          parentBatchId: { $exists: false },
          active: true
        })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'flowPassed', 'quantityRows'])
        .sort({ createdAt: -1 })
        .toArray()
      console.timeEnd('getActivatedBatchesBasic')

      await this.cacheService.setAllBusinessActivatedList(companyToken, businessList)

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBasic(companyToken = '') {
    try {
      console.time('select_all_basic')
      const businessList = await this.db
        .collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
        .sort({ createdAt: -1 })
        .toArray()
      console.timeEnd('select_all_basic')

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatchesActiveBasicByTemplateId(companyToken, templateId = '') {
    try {
      const businessListCached = await this.cacheService.getBusinessActiveListByTemplate(companyToken, templateId)
      if (businessListCached) {
        console.log('BUSINESS_ACTIVE_LIST_CACHED')
        return businessListCached
      }

      console.time('all business list')
      const businessList = await this.db
        .collection('business')
        .find({ companyToken, templateId, parentBatchId: { $exists: false }, active: true })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'quantityRows', 'flowPassed'])
        .toArray()
      console.timeEnd('all business list')

      this.cacheService.setBusinessActiveListByTemplate(companyToken, templateId, businessList)

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getAllBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit
    try {
      console.time('select')
      const businessList = await this.db
        .collection('business')
        .find({ companyToken: companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'quantityRows', 'flowPassed'])
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray()
      console.timeEnd('select')

      const businessListCount = await this.db
        .collection('business')
        .find({ companyToken, parentBatchId: { $exists: false } })
        .project(['_id'])
        .sort({ createdAt: -1 })
        .count()

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1
      }

      return { businessList, pagination }
    } catch (err) {
      throw new Error(err)
    }
  }

  async getActivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit
    try {
      const businessPaginatedListCached = await this.cacheService.getBusinessActivePaginatedList(companyToken, page, limit)
      if (businessPaginatedListCached) {
        console.log('BUSINESS_ACTIVE_PAGINATED_LIST_CACHED')
        return businessPaginatedListCached
      }

      console.time('getActivatedBatchesBasicPaginated')
      const businessList = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          parentBatchId: { $exists: false },
          active: true
        })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'quantityRows', 'flowPassed'])
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray()

      const businessListCount = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          parentBatchId: { $exists: false },
          active: true
        })
        .project(['_id'])
        .count()

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1
      }
      console.timeEnd('getActivatedBatchesBasicPaginated')

      const businessPaginated = { businessList, pagination }

      await this.cacheService.setBusinessActivePaginatedList(companyToken, page, limit, businessPaginated)

      return businessPaginated
    } catch (err) {
      throw new Error(err)
    }
  }

  async getInactivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit
    try {
      console.time('select')
      const businessList = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          parentBatchId: { $exists: false },
          active: false
        })
        .project(['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'aggregateMode', 'quantityRows', 'flowPassed'])
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray()

      const businessListCount = await this.db
        .collection('business')
        .find({
          companyToken: companyToken,
          parentBatchId: { $exists: false },
          active: false
        })
        .project(['_id'])
        .count()

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1
      }

      return { businessList, pagination }
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'data', 'activeUntil', 'active', 'aggregateMode', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'flowPassed', 'active'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listSkippedDataByTemplateAndFilterByColumns(companyToken = '', templateId = '', queryPredicate = new QueryPredicate(), sortColumns = [], limit = 10, page = 0) {
    const offset = page * limit
    let matchParams = []
    if (queryPredicate.isEmpty()) {
      matchParams.push({ templateId })
    } else {
      matchParams = queryPredicate.generateMongoQuery()
    }

    const fieldParsers = queryPredicate.generateMongoQueryFieldParser()

    const fieldsParsedToIgnore = queryPredicate.getFieldsParsedToIgnore()

    const businessIdActives = await this.getBusinessActiveId(companyToken, templateId)

    const fieldsProject = {
      companyToken: 0,
      templateId: 0,
      businessCreatedAt: 0,
      businessUpdatedAt: 0
    }
    for (const f of fieldsParsedToIgnore) {
      fieldsProject[f] = 0
    }

    const sortCriteria = {}
    for (let criteria of sortColumns) {
      const column = Object.keys(criteria)[0]
      const sortType = Object.values(criteria)[0]
      if (column && sortType) {
        sortCriteria[column] = sortType === 'asc' ? 1 : -1
      }
    }
    if (Object.keys(sortCriteria).length === 0) {
      sortCriteria['businessCreatedAt'] = -1
    }

    const aggregateCriteriaFind = []
    const criteriaMatch = {
      companyToken: companyToken,
      templateId: templateId,
      businessId: { $in: businessIdActives }
    }
    if (matchParams.length) {
      criteriaMatch['$and'] = matchParams
    }
    const aggregateMatch = {
      $match: criteriaMatch
    }
    const aggregateProject = {
      $project: fieldsProject
    }
    if (Object.keys(fieldParsers).length) {
      const aggregateAddFields = { $addFields: fieldParsers }
      aggregateCriteriaFind.push(aggregateAddFields)
    }

    aggregateCriteriaFind.push(aggregateMatch)
    aggregateCriteriaFind.push(aggregateProject)

    let businessDataList = await this.db
      .collection('business_data')
      .aggregate(aggregateCriteriaFind)
      // .sort(sortCriteria)
      .skip(offset)
      .limit(limit)
      .toArray()

    businessDataList = businessDataList.map((b) => {
      b.business_id = b.businessId
      delete b.businessId
      return b
    })

    return businessDataList
  }

  async listPaginatedDataByTemplateAndFilterByColumns(companyToken = '', templateId = '', queryPredicate = new QueryPredicate(), sortColumns = [], limit = 10, page = 0) {
    const offset = page * limit
    let matchParams = []
    if (queryPredicate.isEmpty()) {
      matchParams.push({ templateId })
    } else {
      matchParams = queryPredicate.generateMongoQuery()
    }

    const fieldParsers = queryPredicate.generateMongoQueryFieldParser()

    const fieldsParsedToIgnore = queryPredicate.getFieldsParsedToIgnore()

    const businessIdActives = await this.getBusinessActiveId(companyToken, templateId)

    const fieldsProject = {
      companyToken: 0,
      templateId: 0,
      businessCreatedAt: 0,
      businessUpdatedAt: 0
    }
    for (const f of fieldsParsedToIgnore) {
      fieldsProject[f] = 0
    }

    const sortCriteria = {}
    for (let criteria of sortColumns) {
      const column = Object.keys(criteria)[0]
      const sortType = Object.values(criteria)[0]
      if (column && sortType) {
        sortCriteria[column] = sortType === 'asc' ? 1 : -1
      }
    }
    if (Object.keys(sortCriteria).length === 0) {
      sortCriteria['businessCreatedAt'] = -1
    }

    const aggregateCriteriaFind = []
    const aggregateCriteriaCount = []
    const criteriaMatch = {
      companyToken: companyToken,
      templateId: templateId,
      businessId: { $in: businessIdActives }
    }
    if (matchParams.length) {
      criteriaMatch['$and'] = matchParams
    }
    const aggregateMatch = {
      $match: criteriaMatch
    }
    const aggregateProject = {
      $project: fieldsProject
    }
    const aggregateGroup = { $group: { _id: null, totalRows: { $sum: 1 } } }
    if (Object.keys(fieldParsers).length) {
      const aggregateAddFields = { $addFields: fieldParsers }
      aggregateCriteriaFind.push(aggregateAddFields)
      aggregateCriteriaCount.push(aggregateAddFields)
    }

    aggregateCriteriaFind.push(aggregateMatch)
    aggregateCriteriaFind.push(aggregateProject)

    aggregateCriteriaCount.push(aggregateMatch)
    aggregateCriteriaCount.push(aggregateProject)
    aggregateCriteriaCount.push(aggregateGroup)

    console.log('Mongo Query on filter by template ->', JSON.stringify(aggregateCriteriaFind))

    let businessDataList = await this.db.collection('business_data').aggregate(aggregateCriteriaFind).skip(offset).limit(limit).toArray()

    businessDataList = businessDataList.map((b) => {
      b.business_id = b.businessId
      delete b.businessId
      return b
    })

    const countRows = await this.db.collection('business_data').aggregate(aggregateCriteriaCount).toArray()

    const totalRows = countRows.length ? countRows[0].totalRows : 0
    const totalPages = Math.ceil(totalRows / limit) - 1

    const pagination = {
      numRows: totalRows,
      page,
      firstPage: 0,
      lastPage: totalPages
    }

    const result = {
      data: businessDataList,
      pagination
    }

    return result
  }

  async getBusinessActiveId(companyToken = '', templateId = '') {
    let businessIdActives = await this.db
      .collection('business')
      .find({
        companyToken,
        templateId,
        active: true
      })
      .project(['_id'])
      .toArray()
    businessIdActives = businessIdActives.map((b) => b._id)

    return businessIdActives
  }

  async listAllBatchesAndChildsByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'childBatchesId', 'activeUntil', 'active', 'aggregateMode', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'flowPassed', 'active'])
        .toArray()

      const businessChildList = []
      const businessIndexed = {}
      const businessIdList = []
      businessList
        .filter((business) => business.childBatchesId && business.childBatchesId.length > 0)
        .forEach((business) => {
          businessChildList.push(...business.childBatchesId)
          businessIndexed[business._id] = business
          businessIdList.push(new ObjectId(business._id))
        })

      const businessChildDataList = await this.getChildBatches(businessIdList)
      businessChildDataList.forEach((businessChildData) => {
        businessIndexed[businessChildData.parentBatchId].data.push(...businessChildData.data)
      })

      businessList
        .filter((business) => !business.childBatchesId)
        .forEach((business) => {
          businessIndexed[business._id] = business
        })

      return Object.values(businessIndexed)
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllBatchesAndChildsByTemplateId(companyToken, templateId) {
    try {
      console.time(`List all data template ${templateId} from company ${companyToken}`)
      const businessDataList = await this.db
        .collection('business_data')
        .aggregate(
          [
            {
              $match: {
                companyToken: companyToken,
                templateId: templateId
              }
            },
            {
              $group: {
                _id: '$_id',
                data: { $push: '$$ROOT' }
              }
            },
            {
              $project: {
                'data.companyToken': 0,
                'data.templateId': 0,
                'data.businessId': 0,
                'data.businessCreatedAt': 0,
                'data.businessUpdatedAt': 0
              }
            }
          ],
          { allowDiskUse: true }
        )
        .toArray()
      console.timeEnd(`List all data template ${templateId} from company ${companyToken}`)

      return businessDataList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllByTemplateSortedReverse(companyToken, templateId) {
    try {
      let businessList = await this.db
        .collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'activeUntil', 'active', 'aggregateMode', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'flowPassed', 'active'])
        .toArray()
      businessList = businessList.sort((a, b) => (a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateSortedReverse(companyToken, templateId) {
    try {
      let businessList = await this.db.collection('business').find({ templateId, companyToken }).project(['_id', 'name', 'parentBatchId', 'activeUntil', 'active', 'aggregateMode', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'flowPassed', 'active']).toArray()
      businessList = businessList.sort((a, b) => (a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0))

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyColumnList = [], keyValue = '') {
    const matchParams = []
    const matchParamsCache = []
    for (const column of keyColumnList) {
      const param = {}
      const paramCache = {}
      param[column] = new RegExp(keyValue, 'i')
      paramCache[paramCache] = keyValue
      matchParams.push(param)
      matchParamsCache.push(paramCache)
    }

    try {
      const hashPayload = JSON.stringify({
        matchParamsCache,
        companyToken,
        templateId
      })
      const hash = Buffer.from(hashPayload).toString('base64')

      let queryCached = await this.cacheService.getChildByTemplate(companyToken, templateId, hash)
      if (queryCached) {
        console.log('SEARCH_IN_DATA_CACHED')
        return queryCached
      }

      let businessDataList = await this.db
        .collection('business_data')
        .aggregate([
          {
            $match: {
              $or: matchParams,
              companyToken: companyToken,
              templateId: templateId
            }
          },
          {
            $group: {
              _id: '$businessId',
              data: { $push: '$$ROOT' }
            }
          },
          {
            $project: {
              'data.companyToken': 0,
              'data.templateId': 0,
              'data.businessId': 0
            }
          }
        ])
        .toArray()

      const businessIdList = []
      const businessDataMap = {}
      businessDataList.forEach((bd) => {
        businessIdList.push(bd._id)
        businessDataMap[bd._id] = bd
      })

      const businessList = await this.db
        .collection('business')
        .find({ _id: { $in: businessIdList }, companyToken })
        .project(['_id', 'name', 'createdAt', 'updatedAt', 'activeUntil', 'flowPassed', 'aggregateMode', 'active', 'flowPassed'])
        .sort({ createdAt: -1 })
        .toArray()

      businessList.forEach((bus, ind) => {
        businessList[ind].data = businessDataMap[bus._id].data
      })

      console.log('SEARCH_IN_DATA_STORED')
      // global.cache.hashSearch[hash] = {
      //   data: businessList,
      //   expire: new Date()
      // }
      await this.cacheService.setChildByTemplate(companyToken, templateId, hash, businessList)

      return businessList
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async listAllByTemplateListAndKeySortedReverse(companyToken, templateIdList = [], matchParams = []) {
    try {
      const businessDataList = await this.db
        .collection('business_data')
        .aggregate([
          {
            $match: {
              $or: matchParams,
              companyToken: companyToken,
              templateId: { $in: templateIdList }
            }
          },
          {
            $group: {
              _id: '$businessId',
              data: { $push: '$$ROOT' }
            }
          },
          {
            $project: {
              'data.companyToken': 0,
              'data.templateId': 0,
              'data.businessId': 0
            }
          }
        ])
        .toArray()

      const businessIdList = []
      const businessDataMap = {}
      businessDataList.forEach((bd) => {
        businessIdList.push(bd._id)
        businessDataMap[bd._id] = bd
      })

      const businessList = await this.db
        .collection('business')
        .find({ _id: { $in: businessIdList }, companyToken })
        .project(['_id', 'name', 'templateId', 'createdAt', 'activeUntil', 'active', 'flowPassed'])
        .sort({ createdAt: -1 })
        .toArray()

      businessList.forEach((bus, ind) => {
        businessList[ind].data = businessDataMap[bus._id].data
      })

      return businessList
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async listAllAndChildsByTemplateAndKeyCpfCnpjSortedReverse(companyToken, templateId, keyColumnList = [], keyValue = '') {
    const matchParams = []
    const matchParamsCache = []
    for (const column of keyColumnList) {
      const param = {}
      const paramCache = {}
      param[column] = keyValue
      paramCache[paramCache] = keyValue
      matchParams.push(param)
      matchParamsCache.push(paramCache)
    }

    try {
      const hashPayload = JSON.stringify({
        matchParamsCache,
        companyToken,
        templateId
      })
      const hash = Buffer.from(hashPayload).toString('base64')

      let queryCached = await this.cacheService.getChildByTemplate(companyToken, templateId, hash)
      if (queryCached) {
        console.log('SEARCH_IN_DATA_CACHED')
        return queryCached
      }

      let businessDataList = await this.db
        .collection('business_data')
        .aggregate([
          {
            $match: {
              $or: matchParams,
              companyToken: companyToken,
              templateId: templateId
            }
          },
          {
            $group: {
              _id: '$businessId',
              data: { $push: '$$ROOT' }
            }
          },
          {
            $project: {
              'data.companyToken': 0,
              'data.templateId': 0,
              'data.businessId': 0
            }
          }
        ])
        .toArray()

      const businessIdList = []
      const businessDataMap = {}
      businessDataList.forEach((bd) => {
        businessIdList.push(bd._id)
        businessDataMap[bd._id] = bd
      })

      const businessList = await this.db
        .collection('business')
        .find({ _id: { $in: businessIdList }, companyToken })
        .project(['_id', 'name', 'createdAt', 'updatedAt', 'activeUntil', 'flowPassed', 'aggregateMode', 'active', 'flowPassed'])
        .sort({ createdAt: -1 })
        .toArray()

      businessList.forEach((bus, ind) => {
        businessList[ind].data = businessDataMap[bus._id].data
      })

      console.log('SEARCH_IN_DATA_STORED')
      // global.cache.hashSearch[hash] = {
      //   data: businessList,
      //   expire: new Date()
      // }
      await this.cacheService.setChildByTemplate(companyToken, templateId, hash, businessList)

      return businessList
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getLastByTemplateAndKeySortedReverse(companyToken, templateId, keyColumnList = [], keyValue = '') {
    const businessListLast = []

    const matchParams = []
    for (const column of keyColumnList) {
      const param = {}
      param[column] = { $in: [new RegExp(keyValue, 'i')] }
      matchParams.push(param)
    }

    try {
      let businessList = await this.db
        .collection('business')
        .find({ companyToken, templateId, active: true })
        .project({
          _id: 1,
          name: 1,
          activeUntil: 1,
          flowPassed: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1
        })
        .sort({ createdAt: -1 })
        .toArray()

      const businessListIndexed = {}
      const businessIdList = []
      businessList.forEach((b) => {
        businessListIndexed[b._id] = b
        businessIdList.push(b._id)
      })

      const businessListStored = await this.db
        .collection('business_data')
        .aggregate([
          {
            $match: {
              $or: matchParams,
              businessId: { $in: businessIdList },
              companyToken
            }
          },
          {
            $group: {
              _id: '$businessId',
              data: { $push: '$$ROOT' }
            }
          },
          {
            $project: {
              'data.companyToken': 0,
              'data.templateId': 0,
              'data.businessId': 0
            }
          }
        ])
        .limit(1)
        .toArray()

      for (const i in businessListStored) {
        const bData = businessListStored[i]

        const businessIndexed = businessListIndexed[bData._id]
        if (businessIndexed) {
          businessIndexed.data = bData.data
          businessListLast.push(businessIndexed)
        }
      }

      return businessListLast
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getAllBasicByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ templateId, companyToken, parentBatchId: { $exists: false } })
        .project(['_id', 'name', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'aggregateMode', 'flowPassed', 'updatedBy'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getById(companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectId(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'activeUntil', 'active', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'flowPassed', 'aggregateMode'])

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByListId(companyToken = '', searchData = [], searchFields = []) {
    const listBusinessIdQuery = []
    const listParentBusinessIdQuery = []
    const listTemplateIdQuery = []
    const listItemIdQuery = []

    for (const i in searchData) {
      const data = searchData[i]
      const businessId = new ObjectId(data.lote_id)
      listBusinessIdQuery.push(businessId)
      listParentBusinessIdQuery.push(businessId)
      listTemplateIdQuery.push(data.schama)
      listItemIdQuery.push(data.item_id)
    }

    const resultFields = {}
    searchFields.forEach((sf) => {
      resultFields[sf] = 1
    })

    try {
      const businessData = await this.db
        .collection('business_data')
        .find({
          companyToken,
          templateId: { $in: listTemplateIdQuery },
          businessId: { $in: listBusinessIdQuery },
          _id: { $in: listItemIdQuery }
        })
        .project(resultFields)
        .toArray()
      console.log(businessData)
      return businessData
    } catch (err) {
      throw new Error(err)
    }
  }

  async getChildBatches(listParentBatchId = []) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ parentBatchId: { $in: listParentBatchId } })
        .project(['_id', 'parentBatchId', 'data'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataById(companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectId(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'filePath', 'jumpFirstLine', 'customerStorage', 'dataSeparator', 'aggregateMode', 'quantityRows', 'activeUntil', 'invalids', 'flowPassed', 'active', 'createdAt', 'updatedAt'])

      const data = await this.db
        .collection('business_data')
        .find({ companyToken: companyToken, businessId: new ObjectId(id) })
        .project({ companyToken: 0, businessId: 0, templateId: 0 })
        .toArray()

      business.data = data

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getInfoById(companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectId(id), companyToken: companyToken }, ['_id', 'name', 'templateId', 'filePath', 'jumpFirstLine', 'customerStorage', 'dataSeparator', 'aggregateMode', 'quantityRows', 'activeUntil', 'invalids', 'flowPassed', 'active', 'createdAt', 'updatedAt'])

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByIdToExport(companyToken, id) {
    try {
      const business = await this.db.collection('business').findOne({ _id: new ObjectId(id), companyToken: companyToken }, ['_id', 'name', 'templateId'])

      const data = await this.db
        .collection('business_data')
        .find({ companyToken: companyToken, businessId: new ObjectId(id) })
        .project({ companyToken: 0, businessId: 0, templateId: 0, _id: 0, businessCreatedAt: 0, businessUpdatedAt: 0 })
        .toArray()

      business.data = data

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getInvalidsFromBusinessById(companyToken, id) {
    try {
      const options = {
        projection: {
          _id: 1,
          name: 1,
          invalids: 1
        }
      }
      const business = await this.db.collection('business').findOne({ _id: new ObjectId(id), companyToken: companyToken }, options)

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getRegisterByBusinessAndId(companyToken, businessId, registerId) {
    try {
      const register = await this.db.collection('business_data').findOne({
        companyToken: companyToken,
        businessId: new ObjectId(businessId),
        _id: registerId
      })
      return register
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getRegisterById(companyToken, businessId, registerId) {
    try {
      const registerCached = await this.cacheService.getBusinessRegister(companyToken, registerId)
      if (registerCached) {
        console.log('BUSINESS_REGISTER_CACHED')
        return registerCached
      }

      const data = await this.db.collection('business_data').findOne(
        {
          companyToken: companyToken,
          businessId: new ObjectId(businessId),
          _id: registerId
        },
        { fields: { companyToken: 0, businessId: 0, templateId: 0 } }
      )
      if (!data) return data

      const business = await this.db.collection('business').findOne({ _id: new ObjectId(businessId), companyToken: companyToken }, ['_id', 'name'])

      business.data = data

      console.log('BUSINESS_REGISTER_STORED')
      await this.cacheService.setBusinessRegister(companyToken, registerId, business)

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByIdPaginated(companyToken, businessId, page = 0, limit = 10) {
    try {
      const skipDocs = page * limit

      const business = await this.db.collection('business').findOne(
        { _id: new ObjectId(businessId), companyToken },
        {
          fields: { childBatchesId: 0, data: 0 }
        }
      )

      const businessData = await this.db
        .collection('business_data')
        .find({ companyToken, businessId: new ObjectId(businessId) })
        .project({ companyToken: 0, businessId: 0, templateId: 0 })
        .skip(skipDocs)
        .limit(limit)
        .toArray()

      business.data = businessData

      if (business) {
        business.dataPagination = {
          numRows: business.quantityRows,
          page,
          firstPage: 0,
          lastPage: Math.ceil(parseInt(business.quantityRows) / limit) - 1
        }
      }

      return business
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getDataByIdPaginatedAndFieldsSelected(companyToken, businessId, fields = [], queryPredicate = new QueryPredicate(), page = 0, limit = 10) {
    try {
      const skipDocs = page * limit

      let matchParams = []
      if (queryPredicate.isEmpty()) {
        matchParams.push({ companyToken })
      } else {
        matchParams = queryPredicate.generateMongoQuery()
      }

      const fieldParsers = queryPredicate.generateMongoQueryFieldParser()

      const fieldsParsedToIgnore = queryPredicate.getFieldsParsedToIgnore()

      const business = await this.db.collection('business').findOne(
        { _id: new ObjectId(businessId), companyToken },
        {
          fields: { childBatchesId: 0, data: 0 }
        }
      )

      let fieldsProject = {}
      if (fields.length) {
        for (let f of fields) {
          fieldsProject[f] = 1
        }
      } else {
        fieldsProject = { companyToken: 0, businessId: 0, templateId: 0 }
        for (const f of fieldsParsedToIgnore) {
          fieldsProject[f] = 0
        }
      }

      const aggregateGroup = { $group: { _id: null, totalRows: { $sum: 1 } } }
      const criteriaMatch = {
        companyToken,
        businessId: new ObjectId(businessId)
      }
      if (matchParams.length) {
        criteriaMatch['$and'] = matchParams
      }
      const aggregateMatch = {
        $match: criteriaMatch
      }

      const aggregateProject = {
        $project: fieldsProject
      }
      const aggregateCriteriaFind = []
      const aggregateCriteriaCount = []
      if (Object.keys(fieldParsers).length) {
        const aggregateAddFields = { $addFields: fieldParsers }
        aggregateCriteriaFind.push(aggregateAddFields)
        aggregateCriteriaCount.push(aggregateAddFields)
      }
      aggregateCriteriaFind.push(aggregateMatch)
      aggregateCriteriaFind.push(aggregateProject)

      aggregateCriteriaCount.push(aggregateMatch)
      aggregateCriteriaCount.push(aggregateProject)
      aggregateCriteriaCount.push(aggregateGroup)

      console.log('Mongo Query on filter by mailing -> ', JSON.stringify(aggregateCriteriaFind))

      const businessData = await this.db.collection('business_data').aggregate(aggregateCriteriaFind).skip(skipDocs).limit(limit).toArray()

      business.data = businessData

      if (page === 0) {
        const countRows = await this.db.collection('business_data').aggregate(aggregateCriteriaCount).toArray()

        const totalRows = Array.isArray(countRows) && countRows.length ? countRows[0].totalRows : 0

        business.dataPagination = {
          numRowsAllBusiness: business.quantityRows,
          numRows: totalRows,
          page,
          firstPage: 0,
          lastPage: Math.ceil(parseInt(totalRows) / limit) - 1
        }
      }

      return business
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getDataByIdAndChildReference(companyToken, businessId) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({
          $or: [
            { _id: new ObjectId(businessId) },
            {
              parentBatchId: new ObjectId(businessId)
            }
          ],
          companyToken
        })
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }

  async getExpiredBusiness(date) {
    try {
      const businessList = await this.db
        .collection('business')
        .find({ activeUntil: { $lte: date }, active: true })
        .project(['_id', 'companyToken'])
        .toArray()

      return businessList
    } catch (err) {
      throw new Error(err)
    }
  }
}
