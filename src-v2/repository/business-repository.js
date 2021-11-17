const ObjectID = require("mongodb").ObjectID;
const moment = require("moment");

const { calcExpireTime } = require('../helpers/util')

const BYTES_ON_MEGA = 1048576;
const LIMIT_SIZE_DOC_BSON_MEGABYTES = 14;

class BusinessRepository {
  constructor(db) {
    this.db = db;
  }

  async save(
    companyToken,
    name,
    filePath,
    templateId,
    quantityRows,
    fieldsData,
    activeUntil,
    jumpFirstLine = false,
    dataSeparator = "",
    isBatch = true,
    invalids = [],
    createdBy = 0
  ) {
    const business = {
      _id: new ObjectID(),
      companyToken,
      name,
      filePath,
      templateId,
      jumpFirstLine,
      customerStorage: "running",
      dataSeparator,
      isBatch,
      quantityRows,
      activeUntil,
      invalids,
      flow_passed: false,
      active: true,
      createdAt: moment().format(),
      updatedAt: moment().format(),
      createdBy,
      updatedBy: createdBy
    };
    const batches = [business];

    const businessData = fieldsData.map(f => {
      f.businessId = business._id
      f.templateId = business.templateId
      f.companyToken = business.companyToken
      f.businessCreatedAt = business.createdAt
      f.businessUpdatedAt = business.updatedAt

      return f
    })
    

    try {
      
      await this.db.collection("business").insertMany(batches);
      await this.db.collection("business_data").insertMany(businessData)

      return business._id;
    } catch (err) {
      console.error(err)
      throw new Error(err);
    }
  }

  async markFlowPassed(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = { flow_passed: true, updatedAt: moment().format(), updatedBy }
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: businessUpdated },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async unmarkFlowPassed(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = { flow_passed: false, updatedAt: moment().format(), updatedBy }
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: businessUpdated },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async updateRegisterBusiness(registerId, data = {}) {
    try {
      await this.db.collection("business_data")
        .update(
          { _id: registerId },
          { $set: data }
        )
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async updateDataBusiness(businessId, data, updatedBy = 0) {
    try {
      const businessUpdated = { data, updatedAt: moment().format(), updatedBy }
      await this.db
        .collection("business")
        .update(
          { _id: new ObjectID(businessId) },
          { $set: businessUpdated }
        );
    } catch (err) {
      throw new Error(err);
    }
  }

  async activate(companyToken, businessId, activeUntil, updatedBy = 0) {
    try {
      const businessUpdated = { active: true, activeUntil, updatedAt: moment().format(), updatedBy }
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: businessUpdated },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async deactivate(companyToken, businessId, updatedBy = 0) {
    try {
      const businessUpdated = { active: false, updatedAt: moment().format(), updatedBy }
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: businessUpdated },
        { multi: true }
      );
    } catch (err) {
      console.error(err)
      throw new Error(err);
    }
  }

  async getByNameAndTemplateId(companyToken, businessName, templateId) {
    try {
      let businessList = await this.db
        .collection("business")
        .find(
          {
            companyToken: companyToken,
            templateId,
            name: { $regex: new RegExp(businessName, "i") },
          },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy"
          ]
        )
        .toArray();

      businessList = businessList.sort(
        (a, b) => moment(b.createdAt) - moment(a.createdAt)
      );

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getAll(companyToken) {
    try {
      let businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false } },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "data",
          ]
        )
        .toArray();

      businessList = businessList.sort(
        (a, b) => moment(b.createdAt) - moment(a.createdAt)
      );

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getAllBatches(companyToken) {
    try {
      let businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false } },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "data",
          ]
        )
        .toArray();

      businessList = businessList.sort(
        (a, b) => moment(b.createdAt) - moment(a.createdAt)
      );

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getAllBatchesBasic(companyToken) {
    try {
      const businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false } },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "quantityRows",
          ]
        )
        .limit(10)
        .sort({ createdAt: -1 })
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getActivatedBatchesBasic(companyToken) {
    try {
      const businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false }, active: true },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "quantityRows",
          ]
        )
        .sort({ createdAt: -1 })
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getAllBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit;
    try {
      console.time("select");
      const businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false } },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "quantityRows",
          ]
        )
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();
      console.timeEnd("select")

      const businessListCount = await this.db
        .collection("business")
        .find(
          { companyToken, parentBatchId: { $exists: false } },
          ["_id"]
        )
        .sort({ createdAt: -1 })
        .count()
      
      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1,
      };

      return { businessList, pagination };
    } catch (err) {
      throw new Error(err);
    }
  }

  async getActivatedBatchesBasicPaginated (companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit;
    try {
      console.time("select");
      const businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false }, active: true },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "quantityRows",
          ]
        )
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      const businessListCount = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false }, active: true },
          ["_id"]
        )
        .count();

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1,
      };

      return { businessList, pagination };
    } catch (err) {
      throw new Error(err);
    }
  }

  async getInactivatedBatchesBasicPaginated (companyToken, page = 0, limit = 10) {
    const skipDocs = page * limit;
    try {
      console.time("select");
      const businessList = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false }, active: false },
          [
            "_id",
            "name",
            "templateId",
            "activeUntil",
            "active",
            "createdAt",
            "updatedAt",
            "createdBy",
            "updatedBy",
            "quantityRows",
          ]
        )
        .skip(skipDocs)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      const businessListCount = await this.db
        .collection("business")
        .find(
          { companyToken: companyToken, parentBatchId: { $exists: false }, active: false },
          ["_id"]
        )
        .count();

      const pagination = {
        numRows: parseInt(businessListCount),
        page,
        firstPage: 0,
        lastPage: Math.ceil(parseInt(businessListCount) / limit) - 1,
      };

      return { businessList, pagination };
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, [
          "_id",
          "name",
          "data",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy",
          "flow_passed",
          "activeUntil",
          "active",
        ])
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllBatchesAndChildsByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, [
          "_id",
          "name",
          "childBatchesId",
          "data",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy",
          "flow_passed",
          "activeUntil",
          "active",
        ])
        .toArray();

      const businessChildList = [];
      const businessIndexed = {};
      const businessIdList = [];
      businessList
        .filter(
          (business) =>
            business.childBatchesId && business.childBatchesId.length > 0
        )
        .forEach((business) => {
          businessChildList.push(...business.childBatchesId);
          businessIndexed[business._id] = business;
          businessIdList.push(new ObjectID(business._id));
        });

      const businessChildDataList = await this.getChildBatches(businessIdList);
      businessChildDataList.forEach((businessChildData) => {
        businessIndexed[businessChildData.parentBatchId].data.push(
          ...businessChildData.data
        );
      });

      businessList
        .filter((business) => !business.childBatchesId)
        .forEach((business) => {
          businessIndexed[business._id] = business;
        });

      return Object.values(businessIndexed);
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllBatchesAndChildsByTemplateId(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken }, [
          "_id",
          "name",
          "childBatchesId",
          "data",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy",
          "flow_passed",
          "activeUntil",
          "active",
        ])
        .toArray();

      // const businessChildList = []
      // const businessIndexed = {}
      // const businessIdList = []
      // businessList.filter(business => business.childBatchesId && business.childBatchesId.length > 0)
      //   .forEach(business => {
      //     businessChildList.push(...business.childBatchesId)
      //     businessIndexed[business._id] = business
      //     businessIdList.push(new ObjectID(business._id))
      //   })

      // const businessChildDataList = await this.getChildBatches(businessIdList)
      // businessChildDataList.forEach(businessChildData => {
      //   businessIndexed[businessChildData.parentBatchId].data.push(...businessChildData.data)
      // })

      // businessList.filter(business => !business.childBatchesId)
      //   .forEach(business => { businessIndexed[business._id] = business })

      return Object.values(businessList);
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllByTemplateSortedReverse(companyToken, templateId) {
    try {
      let businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, [
          "_id",
          "name",
          "data",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy",
          "flow_passed",
          "activeUntil",
          "active",
        ])
        .toArray();
      businessList = businessList.sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      );

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllAndChildsByTemplateSortedReverse(companyToken, templateId) {
    try {
      let businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken }, [
          "_id",
          "name",
          "data",
          "parentBatchId",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy",
          "flow_passed",
          "activeUntil",
          "active",
        ])
        .toArray();
      businessList = businessList.sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      );

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async listAllAndChildsByTemplateAndKeySortedReverse (
    companyToken,
    templateId,
    keyColumnList = [],
    keyValue = ''
  ) {
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
      const hashPayload = JSON.stringify({ matchParamsCache, companyToken, templateId })
      const hash = Buffer.from(hashPayload).toString('base64')
      
      if (global.cache.hashSearch[hash]) {
        const queryCached = global.cache.hashSearch[hash]
        if (queryCached && queryCached.expire && calcExpireTime(new Date(), queryCached.expire) < global.cache.default_expire) {
          console.log('SEARCH_IN_DATA_CACHED')
          return queryCached.data
        } else {
          global.cache.hashSearch[hash] = null
        }
      }

      let businessDataList = await this.db
        .collection("business_data")
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
      // businessListStored = businessListStored.sort((a, b) =>
      //   a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      // );

      // for (const i in businessListStored) {
      //   const bData = businessListStored[i];
      //   businessList.push({
      //     _id: bData.parentBatchId ? bData.parentBatchId : bData._id,
      //     name: bData.name,
      //     data: bData.data,
      //     activeUntil: bData.activeUntil,
      //     flow_passed: bData.flow_passed,
      //     active: bData.active,
      //     createdAt: bData.createdAt,
      //     updatedAt: bData.updatedAt,
      //   });
      // }

      const businessIdList = []
      const businessDataMap = {}
      businessDataList.forEach(bd => {
        businessIdList.push(bd._id)
        businessDataMap[bd._id] = bd
      })

      const businessList = await this.db.collection('business')
        .find(
          { _id: { $in: businessIdList }, companyToken },
          ['_id', 'name', 'createdAt']
        )
        .sort({ createdAt: -1 })
        .toArray()

      businessList.forEach((bus, ind) => {
        businessList[ind].data = businessDataMap[bus._id].data
      })

      console.log('SEARCH_IN_DATA_STORED')
      global.cache.hashSearch[hash] = { data: businessList, expire: new Date() }

      return businessList;
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async listAllByTemplateListAndKeySortedReverse (
    companyToken,
    templateIdList = [],
    matchParams = []
  ) {
    console.log(matchParams, templateIdList)
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
      // businessListStored = businessListStored.sort((a, b) =>
      //   a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      // );

      // for (const i in businessListStored) {
      //   const bData = businessListStored[i];
      //   businessList.push({
      //     _id: bData.parentBatchId ? bData.parentBatchId : bData._id,
      //     name: bData.name,
      //     data: bData.data,
      //     activeUntil: bData.activeUntil,
      //     flow_passed: bData.flow_passed,
      //     active: bData.active,
      //     createdAt: bData.createdAt,
      //     updatedAt: bData.updatedAt,
      //   });
      // }

      const businessIdList = []
      const businessDataMap = {}
      businessDataList.forEach(bd => {
        businessIdList.push(bd._id)
        businessDataMap[bd._id] = bd
      })

      const businessList = await this.db.collection('business')
        .find(
          { _id: { $in: businessIdList }, companyToken },
          ['_id', 'name', 'templateId', 'createdAt']
        )
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

  async getLastByTemplateAndKeySortedReverse (
    companyToken,
    templateId,
    keyColumnList = [],
    keyValue = ""
  ) {
    const businessListLast = [];

    const matchParams = [];
    for (const column of keyColumnList) {
      const param = {};
      param[column] = { $in: [new RegExp(keyValue, "i")] };
      matchParams.push(param);
    }

    try {
      let businessList = await this.db
        .collection("business")
        .find(
          { companyToken, templateId, active: true },
          { _id: 1, name: 1, activeUntil: 1, flow_passed: 1, active: 1, createdAt: 1, updatedAt: 1 }
        )
        .sort({ createdAt: -1 })
        .toArray();
      // businessIdList = businessIdList
      //   .sort((a, b) =>
      //     a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      //   )
      //   .map((b) => b._id);
      const businessListIndexed = {}
      const businessIdList = []
      businessList.forEach((b) => {
        businessListIndexed[b._id] = b
        businessIdList.push(b._id)
      })

      const businessListStored = await this.db
        .collection("business_data")
        .aggregate([
          { $match: { $or: matchParams, businessId: { $in: businessIdList }, companyToken } },
          {
            $group: {
              _id: "$businessId",
              data: { $push: "$$ROOT" },
            },
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
        const bData = businessListStored[i];

        const businessIndexed = businessListIndexed[bData._id]
        if (businessIndexed) {
          businessIndexed.data = bData.data
          businessListLast.push(businessIndexed)
        }

        // businessList.push({
        //   _id: bData.parentBatchId ? bData.parentBatchId : bData._id,
        //   name: bData.name,
        //   data: bData.data,
        //   activeUntil: bData.activeUntil,
        //   flow_passed: bData.flow_passed,
        //   active: bData.active,
        //   createdAt: bData.createdAt,
        //   updatedAt: bData.updatedAt,
        // });
      }

      return businessListLast;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async getAllBasicByTemplate(companyToken, templateId) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ templateId, companyToken, parentBatchId: { $exists: false } }, [
          "_id",
          "name",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy"
        ])
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getById(companyToken, id) {
    try {
      const business = await this.db
        .collection("business")
        .findOne({ _id: new ObjectID(id), companyToken: companyToken }, [
          "_id",
          "name",
          "templateId",
          "activeUntil",
          "active",
          "createdAt",
          "updatedAt",
          "createdBy",
          "updatedBy"
        ]);

      return business;
    } catch (err) {
      throw new Error(err);
    }
  }
  
  async getDataByListId (companyToken = '', searchData = [], searchFields = []) {
    const listBusinessIdQuery = []
    const listParentBusinessIdQuery = []
    const listTemplateIdQuery = []
    const listItemIdQuery = []

    for (const i in searchData) {
      const data = searchData[i]
      const businessId = new ObjectID(data.lote_id)
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
        .find(
          {
            companyToken,
            templateId: { $in: listTemplateIdQuery },
            businessId: { $in: listBusinessIdQuery },
            _id: { $in: listItemIdQuery }
          },
          {
            ...resultFields
          }
        )
        .toArray()
      return businessData
    } catch (err) {
      throw new Error(err)
    }
  }


  async getChildBatches(listParentBatchId = []) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ parentBatchId: { $in: listParentBatchId } }, [
          "_id",
          "parentBatchId",
          "data",
        ])
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getDataById (companyToken, id) {
    try {
      const business = await this.db.collection('business')
        .findOne(
          { _id: new ObjectID(id), companyToken: companyToken },
          ['_id', 'name', 'templateId', 'filePath', 'jumpFirstLine', 'customerStorage', 'dataSeparator', 'quantityRows', 'activeUntil', 'invalids', 'flow_passed', 'active', 'createdAt', 'updatedAt']
        )

      const data = await this.db.collection('business_data')
        .find(
          { companyToken: companyToken, businessId: new ObjectID(id) }, { fields: { companyToken: 0, businessId: 0, templateId: 0 } }
        )
        .toArray()

      business.data = data

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getRegisterByBusinessAndId (companyToken, businessId, registerId) {
    try {
      const register = await this.db.collection('business_data')
        .findOne(
          { companyToken: companyToken, businessId: new ObjectID(businessId), _id: registerId }
        )
      return register
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }

  async getRegisterById (companyToken, businessId, registerId) {
    try {
      const data = await this.db.collection('business_data')
        .findOne(
          { companyToken: companyToken, businessId: new ObjectID(businessId), _id: registerId },
          { fields: { companyToken: 0, businessId: 0, templateId: 0 } }
        )
      if (!data) return data

      const business = await this.db.collection('business')
        .findOne(
          { _id: new ObjectID(businessId), companyToken: companyToken },
          ['_id', 'name']
        )

      business.data = data

      return business
    } catch (err) {
      throw new Error(err)
    }
  }

  async getDataByIdPaginated(companyToken, businessId, page = 0, limit = 10) {
    try {
      const skipDocs = page * limit;

      const business = await this.db
        .collection("business")
        .findOne(
          { _id: new ObjectID(businessId), companyToken },
          { fields: { childBatchesId: 0, data: 0 } }
        );

      const businessData = await this.db.collection('business_data')
        .find(
          { companyToken, businessId: ObjectID(businessId) },
          { fields: { companyToken: 0, businessId: 0, templateId: 0 } }
        )
        .skip(skipDocs)
        .limit(limit)
        .toArray()

      business.data = businessData

      if (business) {
        business.dataPagination = {
          numRows: business.quantityRows,
          page,
          firstPage: 0,
          lastPage: Math.ceil(parseInt(business.quantityRows) / limit) - 1,
        };
      }

      return business;
    } catch (err) {
      console.error(err)
      throw new Error(err);
    }
  }

  async getDataByIdAndChildReference(companyToken, businessId) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        })
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getExpiredBusiness(date) {
    try {
      const businessList = await this.db
        .collection("business")
        .find({ activeUntil: date, active: true }, ["_id", "companyToken"])
        .toArray();

      return businessList;
    } catch (err) {
      throw new Error(err);
    }
  }
}

module.exports = BusinessRepository;
