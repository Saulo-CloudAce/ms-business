const ObjectID = require("mongodb").ObjectID;
const moment = require("moment");

const BYTES_ON_MEGA = 1048576;
const LIMIT_SIZE_DOC_BSON_MEGABYTES = 14;

class BusinessRepository {
  constructor(db) {
    this.db = db;
  }

  _createNewInstance(data = {}) {
    return {
      _id: new ObjectID(),
      companyToken: data.companyToken,
      name: data.name,
      filePath: data.filePath,
      templateId: data.templateId,
      jumpFirstLine: data.jumpFirstLine,
      customerStorage: "running",
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
      updatedAt: moment().format(),
    };
  }

  _calculateSizeBatch(batch) {
    const sizeBytes = Buffer.byteLength(JSON.stringify(batch), "utf-8");
    const sizeMegaBytes = sizeBytes / BYTES_ON_MEGA;
    return sizeMegaBytes;
  }

  _splitDataBatch(data, sizeDataMegaBytes) {
    const batches = [];
    const quantityParts = Math.ceil(
      sizeDataMegaBytes / LIMIT_SIZE_DOC_BSON_MEGABYTES
    );
    const quantityRows = data.data.length;
    const quantityRowsByPart = Math.ceil(quantityRows / quantityParts);

    const firstBatch = this._createNewInstance(data);
    firstBatch.data = data.data.splice(0, quantityRowsByPart);
    firstBatch.quantityBatchRows = firstBatch.data.length;
    firstBatch.quantityRows = quantityRows;
    batches.push(firstBatch);

    for (let i = 0; i < quantityParts - 1; i++) {
      const indexInit = i * quantityRowsByPart;
      const indexEnd = indexInit + quantityRowsByPart;
      const batch = this._createNewInstance(data);
      const batchData = data.data.slice(indexInit, indexEnd);
      batch.data = batchData;
      batch.quantityRows = batch.data.length;
      batch.quantityBatchRows = batch.data.length;
      batch.parentBatchId = firstBatch._id;

      batches[0].childBatchesId.push(batch._id);
      batches.push(batch);
    }

    return batches;
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
    invalids = []
  ) {
    const data = {
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
      data: fieldsData,
      activeUntil,
      invalids,
      flow_passed: false,
      active: true,
      createdAt: moment().format(),
      updatedAt: moment().format(),
    };
    let batches = [data];

    const sizeDataMegaBytes = this._calculateSizeBatch(data);

    if (sizeDataMegaBytes > LIMIT_SIZE_DOC_BSON_MEGABYTES) {
      batches = this._splitDataBatch(data, sizeDataMegaBytes);
    }

    try {
      await this.db.collection("business").insertMany(batches);
      const id = batches[0]._id;
      return id;
    } catch (err) {
      throw new Error(err);
    }
  }

  async markFlowPassed(companyToken, businessId) {
    try {
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: { flow_passed: true, updatedAt: moment().format() } },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async unmarkFlowPassed(companyToken, businessId) {
    try {
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: { flow_passed: false, updatedAt: moment().format() } },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async updateDataBusiness(businessId, data) {
    try {
      await this.db
        .collection("business")
        .update(
          { _id: new ObjectID(businessId) },
          { $set: { data, updatedAt: moment().format() } }
        );
    } catch (err) {
      throw new Error(err);
    }
  }

  async activate(companyToken, businessId, activeUntil) {
    try {
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: { active: true, activeUntil, updatedAt: moment().format() } },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }
  }

  async deactivate(companyToken, businessId) {
    try {
      await this.db.collection("business").update(
        {
          $or: [
            { _id: new ObjectID(businessId) },
            { parentBatchId: new ObjectID(businessId) },
          ],
          companyToken,
        },
        { $set: { active: false, updatedAt: moment().format() } },
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
          { companyToken: companyToken, parentBatchId: { $exists: false } },
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

  async getActivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
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

  async getInactivatedBatchesBasicPaginated(companyToken, page = 0, limit = 10) {
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

  async listAllAndChildsByTemplateAndKeySortedReverse(
    companyToken,
    templateId,
    keyColumnList = [],
    keyValue = ""
  ) {
    const businessList = [];

    const matchParams = [];
    for (const column of keyColumnList) {
      const param = {};
      param["data." + column] = { $in: [new RegExp(keyValue, "i")] };
      matchParams.push(param);
    }
    try {
      let businessListStored = await this.db
        .collection("business")
        .aggregate([
          { $unwind: "$data" },
          {
            $match: {
              $or: matchParams,
              companyToken: companyToken,
              templateId: templateId,
            },
          },
          {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              activeUntil: { $first: "$activeUntil" },
              flow_passed: { $first: "$flow_passed" },
              active: { $first: "$active" },
              createdAt: { $first: "$createdAt" },
              updatedAt: { $first: "$updatedAt" },
              data: { $addToSet: "$data" },
            },
          },
        ])
        .toArray();
      businessListStored = businessListStored.sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
      );

      for (const i in businessListStored) {
        const bData = businessListStored[i];
        businessList.push({
          _id: bData.parentBatchId ? bData.parentBatchId : bData._id,
          name: bData.name,
          data: bData.data,
          activeUntil: bData.activeUntil,
          flow_passed: bData.flow_passed,
          active: bData.active,
          createdAt: bData.createdAt,
          updatedAt: bData.updatedAt,
        });
      }

      return businessList;
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  async getLastByTemplateAndKeySortedReverse(
    companyToken,
    templateId,
    keyColumnList = [],
    keyValue = ""
  ) {
    const businessList = [];

    const matchParams = [];
    for (const column of keyColumnList) {
      const param = {};
      param["data." + column] = { $in: [new RegExp(keyValue, "i")] };
      matchParams.push(param);
    }
    try {
      let businessIdList = await this.db
        .collection("business")
        .find(
          { companyToken, templateId, active: true },
          { _id: 1, createdAt: -1 }
        )
        .toArray();
      businessIdList = businessIdList
        .sort((a, b) =>
          a.createdAt > b.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0
        )
        .map((b) => b._id);

      const businessListStored = await this.db
        .collection("business")
        .aggregate([
          { $unwind: "$data" },
          { $match: { $or: matchParams, _id: { $in: businessIdList } } },
          {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              activeUntil: { $first: "$activeUntil" },
              flow_passed: { $first: "$flow_passed" },
              active: { $first: "$active" },
              createdAt: { $first: "$createdAt" },
              updatedAt: { $first: "$updatedAt" },
              data: { $addToSet: "$data" },
            },
          },
        ])
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      for (const i in businessListStored) {
        const bData = businessListStored[i];
        businessList.push({
          _id: bData.parentBatchId ? bData.parentBatchId : bData._id,
          name: bData.name,
          data: bData.data,
          activeUntil: bData.activeUntil,
          flow_passed: bData.flow_passed,
          active: bData.active,
          createdAt: bData.createdAt,
          updatedAt: bData.updatedAt,
        });
      }

      return businessList;
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
        ]);

      return business;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getDataByListId(companyToken = "", searchData = [], searchFields = []) {
    const listBusinessIdQuery = [];
    const listParentBusinessIdQuery = [];
    const listTemplateIdQuery = [];
    const listItemIdQuery = [];

    for (const i in searchData) {
      const data = searchData[i];
      const businessId = new ObjectID(data.lote_id);
      listBusinessIdQuery.push(businessId);
      listParentBusinessIdQuery.push(businessId);
      listTemplateIdQuery.push(data.schama);
      listItemIdQuery.push(data.item_id);
    }

    const resultFields = {};
    searchFields.forEach((sf) => {
      resultFields[`data.${sf}`] = 1;
    });

    try {
      const business = await this.db
        .collection("business")
        .find(
          {
            companyToken,
            templateId: { $in: listTemplateIdQuery },
            $or: [
              { _id: { $in: listBusinessIdQuery } },
              { parentBatchId: { $in: listParentBusinessIdQuery } },
            ],
            "data._id": { $in: listItemIdQuery },
          },
          {
            ...resultFields,
          }
        )
        .toArray();
      const businessFiltered = [];
      business.forEach((b) => {
        const businessDataFiltered = b.data.filter(
          (d) => listItemIdQuery.indexOf(d._id) >= 0
        );
        b.data = businessDataFiltered;
        if (businessDataFiltered.length >= 1) businessFiltered.push(b);
      });
      return businessFiltered;
    } catch (err) {
      throw new Error(err);
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

  async getDataById(companyToken, id) {
    try {
      const business = await this.db
        .collection("business")
        .findOne({ _id: new ObjectID(id), companyToken: companyToken });

      if (
        business &&
        business.childBatchesId &&
        business.childBatchesId.length > 0
      ) {
        const businessChildList = await this.getChildBatches([
          new ObjectID(id),
        ]);
        businessChildList.forEach((businessChild) => {
          if (
            businessChild.parentBatchId.toString() === business._id.toString()
          ) {
            business.data = business.data.concat(businessChild.data);
          }
        });
      }

      return business;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getDataByIdPaginated(companyToken, businessId, page = 0, limit = 10) {
    try {
      const skipDocs = page * limit;

      const business = await this.db
        .collection("business")
        .findOne({ _id: new ObjectID(businessId), companyToken: companyToken });

      if (business.childBatchesId) {
        const businessChildBatchesDataList = await this.getChildBatches([
          new ObjectID(businessId),
        ]);
        for (const i in businessChildBatchesDataList) {
          const businessChildBatchData = businessChildBatchesDataList[i];
          business.data.push(...businessChildBatchData.data);
        }
      }

      business.data = business.data.slice(skipDocs, skipDocs + limit);

      if (business) {
        delete business.childBatchesId;

        business.dataPagination = {
          numRows: business.quantityRows,
          page,
          firstPage: 0,
          lastPage: Math.ceil(parseInt(business.quantityRows) / limit) - 1,
        };
      }

      return business;
    } catch (err) {
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
