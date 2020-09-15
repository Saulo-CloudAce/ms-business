const express = require('express')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const multipart = require('connect-multiparty')
const helmet = require('helmet')
const cors = require('cors')

const businessRoutes = require('../src/routes/business')
const companyRoutes = require('../src/routes/company')
const templateRoutes = require('../src/routes/template')
const customerRoutes = require('../src/routes/customer')
const healthRoutes = require('../src/routes/health')

const businessRoutesV2 = require('../src-v2/routes/business')
const companyRoutesV2 = require('../src-v2/routes/company')
const templateRoutesV2 = require('../src-v2/routes/template')
const customerRoutesV2 = require('../src-v2/routes/customer')
const healthRoutesV2 = require('../src-v2/routes/health')

const { connect } = require('../config/mongodb')
const healthRoute = require('../src/routes/health')

const app = express()
app.use(bodyParser.json({ limit: '5000mb' }))
app.use(bodyParser.urlencoded({ limit: '5000mb', extended: true }))
app.use(expressValidator())
app.use(multipart())
app.use(helmet())
app.use(cors())

businessRoutes(app)
companyRoutes(app)
templateRoutes(app)
customerRoutes(app)
healthRoutes(app)

businessRoutesV2(app)
companyRoutesV2(app)
templateRoutesV2(app)
customerRoutesV2(app)
healthRoutesV2(app)

const port = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  connect(app, () => {
    app.listen(port, () => {
      console.log(`API is live on port ${port}`)
    })
  })
}

module.exports = app
