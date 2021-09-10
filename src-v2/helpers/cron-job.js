const Cron = require('cron').CronJob
const BusinessController = require('../controllers/business-controller')

const businessController = new BusinessController(null)

const enableAutoDisableExpired = (process.env.ENABLE_AUTO_DISABLE_MAILING_EXPIRED) ? process.env.ENABLE_AUTO_DISABLE_MAILING_EXPIRED : false
if (String(enableAutoDisableExpired) === 'true') {
    const deactivateExpiredBusiness = new Cron('50 23 * * *', async () => await businessController.deactivateExpiredBusiness(), null, true)
}

