const express = require('express')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const multipart = require('connect-multiparty')

const businessRoutes = require('../src/routes/business')

const app = express()
app.use(bodyParser.json({ limit: '250mb' }))
app.use(bodyParser.urlencoded({ limit: '250mb', extended: true }))
app.use(expressValidator())
app.use(multipart())

businessRoutes(app)

const port = 3000 || process.env.PORT

app.listen(port, () => {
  console.log(`API is live on port ${port}`)
})

module.exports = app
