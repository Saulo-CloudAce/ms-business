const PREFIX_KEY = 'msbusiness'

export default class CacheService {
  constructor(redisInstance = {}) {
    this.redis = redisInstance
  }

  async setBusinessRegister(companyToken = '', registerId = '', dataRegister = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:register:${registerId}`
    await this.redis.hset(key, 'data', JSON.stringify(dataRegister))
    await this._setTTL(key)
  }

  async getBusinessRegister(companyToken = '', registerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:register:${registerId}`
    let register = await this.redis.hget(key, 'data')
    if (register) {
      register = JSON.parse(register)
    }
    return register
  }

  async removeBusinessRegister(companyToken = '', registerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:register:${registerId}`
    await this.redis.hdel(key, 'data')
  }

  async setTemplate(companyToken = '', templateId = '', template = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:template:${templateId}`
    await this.redis.hset(key, 'data', JSON.stringify(template))

    await this._setTTL(key)
  }

  async getTemplate(companyToken = '', templateId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:template:${templateId}`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeTemplate(companyToken = '', templateId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:template:${templateId}`
    await this.redis.hdel(key, 'data')
  }

  async setBusinessActivePaginatedList(companyToken = '', page = 0, limit = 0, data = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:business_activated:page:${page}:limit:${limit}`
    await this.redis.hset(key, 'data', JSON.stringify(data))

    await this._setTTL(key)
  }

  async getBusinessActivePaginatedList(companyToken = '', page = 0, limit = 0) {
    const key = `${PREFIX_KEY}:${companyToken}:business_activated:page:${page}:limit:${limit}`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeBusinessActivePaginatedList(companyToken = '') {
    const keyPattern = `${PREFIX_KEY}:${companyToken}:business_activated:*`
    const keysStored = await this.redis.keys(keyPattern)

    if (keysStored.length === 0) return

    const requestsKeyDeletion = []
    for (let i = 0; i < keysStored.length; i++) {
      const key = keysStored[i]
      requestsKeyDeletion.push(this.redis.hdel(key, 'data'))
    }

    await Promise.all(requestsKeyDeletion)
  }

  async setCustomerFormatted(companyToken = '', customerId = '', data = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:customer_formatted:${customerId}`
    await this.redis.hset(key, 'data', JSON.stringify(data))

    await this._setTTL(key)
  }

  async getCustomerFormatted(companyToken = '', customerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:customer_formatted:${customerId}`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeCustomerFormatted(companyToken = '', customerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:customer_formatted:${customerId}`

    await this.redis.hdel(key, 'data')
  }

  async removeAllCustomerFormatted(companyToken = '') {
    const keyPattern = `${PREFIX_KEY}:${companyToken}:customer_formatted:*`
    const keysStored = await this.redis.keys(keyPattern)

    if (keysStored.length === 0) return

    const requestsKeyDeletion = []
    for (let i = 0; i < keysStored.length; i++) {
      const key = keysStored[i]
      requestsKeyDeletion.push(this.redis.hdel(key, 'data'))
    }
    await Promise.all(requestsKeyDeletion)
  }

  async setCustomer(companyToken = '', customerId = '', data = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:customer:${customerId}`
    await this.redis.hset(key, 'data', JSON.stringify(data))

    await this._setTTL(key)
  }

  async getCustomer(companyToken = '', customerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:customer:${customerId}`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeCustomer(companyToken = '', customerId = '') {
    const key = `${PREFIX_KEY}:${companyToken}:customer:${customerId}`

    await this.redis.hdel(key, 'data')
  }

  async removeAllCustomer(companyToken = '') {
    const keyPattern = `${PREFIX_KEY}:${companyToken}:customer:*`
    const keysStored = await this.redis.keys(keyPattern)

    if (keysStored.length === 0) return

    const requestsKeyDeletion = []
    for (let i = 0; i < keysStored.length; i++) {
      const key = keysStored[i]
      requestsKeyDeletion.push(this.redis.hdel(key, 'data'))
    }
    await Promise.all(requestsKeyDeletion)
  }

  async setChildByTemplate(companyToken = '', templateId = '', hash = '', data = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:template:${templateId}:childs:${hash}`
    await this.redis.hset(key, 'data', JSON.stringify(data))

    await this._setTTL(key)
  }

  async getChildByTemplate(companyToken = '', templateId = '', hash = '') {
    const key = `${PREFIX_KEY}:${companyToken}:template:${templateId}:childs:${hash}`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeChildByTemplate(companyToken = '', templateId = '') {
    const keyPattern = `${PREFIX_KEY}:${companyToken}:template:${templateId}:childs:*`
    const keysStored = await this.redis.keys(keyPattern)

    if (keysStored.length === 0) return

    const requestsKeyDeletion = []
    for (let i = 0; i < keysStored.length; i++) {
      const key = keysStored[i]
      requestsKeyDeletion.push(this.redis.hdel(key, 'data'))
    }

    await Promise.all(requestsKeyDeletion)
  }

  // List All Business Activated

  async setAllBusinessActivatedList(companyToken = '', data = {}) {
    const key = `${PREFIX_KEY}:${companyToken}:business_all_activated`
    await this.redis.hset(key, 'data', JSON.stringify(data))

    await this._setTTL(key)
  }

  async getAllBusinessActivatedList(companyToken = '') {
    const key = `${PREFIX_KEY}:${companyToken}:business_all_activated`
    let template = await this.redis.hget(key, 'data')
    if (template) {
      template = JSON.parse(template)
    }

    return template
  }

  async removeAllBusinessActivatedList(companyToken = '') {
    const keyPattern = `${PREFIX_KEY}:${companyToken}:business_all_activated`
    await this.redis.hdel(keyPattern, 'data')
  }

  async _setTTL(key = '') {
    const ttl = process.env.REDIS_TTL ? process.env.REDIS_TTL : 10
    this.redis.expire(key, ttl)
  }
}
