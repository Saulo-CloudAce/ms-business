import express from 'express'
import bodyParser from 'body-parser'
import multipart from 'connect-multiparty'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'

import businessRoutesV2 from '../src-v2/routes/business.js'
import companyRoutesV2 from '../src-v2/routes/company.js'
import templateRoutesV2 from '../src-v2/routes/template.js'
import customerRoutesV2 from '../src-v2/routes/customer.js'
import healthRoutesV2 from '../src-v2/routes/health.js'

import { connect } from '../config/mongodb.js'
import Redis from './redis.js'

const app = express()
app.use(bodyParser.json({ limit: '5000mb' }))
app.use(bodyParser.urlencoded({ limit: '5000mb', extended: true }))
app.use(multipart())
app.use(helmet())
app.use(cors())

app.use(morgan('combined'))

businessRoutesV2(app)
companyRoutesV2(app)
templateRoutesV2(app)
customerRoutesV2(app)
healthRoutesV2(app)

const port = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  const redisInstance = Redis.newConnection()
  app.locals.redis = redisInstance
  connect(app, () => {
    app.listen(port, () => {
      console.log(`API is live on port ${port}`)
    })
  })
}

global.cache = {
  companies: {},
  templates: {},
  customers: {},
  customers_formatted: {},
  hashSearch: {},
  business_data: {},
  default_expire: process.env.EXPIRE_CACHE_IN_SECONDS ? parseInt(process.env.EXPIRE_CACHE_IN_SECONDS) : 3600
}

export default app
