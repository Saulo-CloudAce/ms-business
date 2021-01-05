const Cron = require('cron').CronJob
const BusinessController = require('../controllers/business-controller')

const businessController = new BusinessController(null)

const deactivateExpiredBusiness = new Cron('* * * * * *', async () => await businessController.deactivateExpiredBusiness(), null, true)
