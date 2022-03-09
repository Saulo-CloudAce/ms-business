import { CronJob as Cron } from 'cron'
import BusinessController from '../controllers/business-controller.js'

export function runCronJob() {
  const businessController = new BusinessController(null)

  const enableAutoDisableExpired = process.env.ENABLE_AUTO_DISABLE_MAILING_EXPIRED ? process.env.ENABLE_AUTO_DISABLE_MAILING_EXPIRED : false
  if (String(enableAutoDisableExpired) === 'true') {
    new Cron('50 23 * * *', async () => await businessController.deactivateExpiredBusiness(), null, true)
  }
}
