import dotenv from 'dotenv'

dotenv.config()

import { runCronJob } from './src-v2/helpers/cron-job.js'
import server from './config/server.js'
// import RabbitMQ from './config/rabbitmq.js'
import { startConsumersQueues } from './config/consumerqueues.js'

// const conn = await RabbitMQ.newConnection()

startConsumersQueues(server)

runCronJob()
server.listen()
