import BusinessController from '../src-v2/controllers/business-controller.js'
import RabbitMQ from './rabbitmq.js'

const businessController = new BusinessController(null)

export async function startConsumersQueues(app = {}) {
  const connRabbit = await RabbitMQ.newConnection()
  RabbitMQ.addConsumer(businessController.queuePostProcess.bind(businessController))

  RabbitMQ.startConsumers(connRabbit, app)
}
