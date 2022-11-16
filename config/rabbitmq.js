import amqp from 'amqplib/callback_api.js'

global._consumers = []
global._connRabbitGlobal = false

export default class RabbitMQ {
  static async newConnection() {
    if (global._connRabbitGlobal) {
      return global._connRabbitGlobal
    }

    const rabbitmqUser = process.env.RABBITMQ_USER
    const rabbitmqPass = process.env.RABBITMQ_PASSWORD
    const rabbitmqHost = process.env.RABBITMQ_HOST
    const rabbitmqPort = process.env.RABBITMQ_PORT

    const connStr = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}:${rabbitmqPort}`

    const connRabbit = await new Promise((resolve, reject) => {
      amqp.connect(connStr + '?heartbeat=20', function (err, conn) {
        if (err) {
          console.error(`Global connection with rabbitmq failed with error: ${err.message}`)
          return setTimeout(function () {
            RabbitMQ.newConnection()
          }, 1000)
        }
        conn.on('error', function (err) {
          if (err.message !== 'Connection closing') {
            console.error(`Global connection with rabbitmq failed with error: ${err.message}`)
            reject(err)
          }
        })
        conn.on('close', function () {
          console.error(`Global Connection with rabbitmq was close, restart api to try reconnect`)
          return setTimeout(function () {
            global._connRabbitGlobal = false
            RabbitMQ.newConnection()
          }, 1000)
        })

        resolve(conn)
        console.info(`Global connection with rabbitmq successful`)
      })
    })

    global._connRabbitGlobal = connRabbit

    RabbitMQ.startConsumers(connRabbit)

    return global._connRabbitGlobal
  }

  static addConsumer(consumer = {}) {
    global._consumers.push(consumer)
  }

  static startConsumers(connRabbit = {}, app = {}) {
    const consumers = global._consumers
    for (let i = 0; i < consumers.length; i++) {
      const consumer = consumers[i]
      consumer(connRabbit, app)
    }
  }
}
