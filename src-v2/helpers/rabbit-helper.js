import RabbitMQ from '../../config/rabbitmq.js'

export async function sendToQueuePostProcess(data = {}) {
  if (process.env.STATE_ENV === 'testing') return true

  try {
    const conn = await createConn()

    const channel = await createChannel(conn)

    const queue = 'msbusiness:post_process'

    channel.assertQueue(queue, { durable: true })
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true })

    closeChannel(channel)

    return true
  } catch (error) {
    console.error('ERRO AO PUBLICAR MENSAGEM NA FILA  ==>>', error)
    return false
  }
}

async function createConn() {
  return await RabbitMQ.newConnection()
}

async function createChannel(conn = {}) {
  return new Promise((resolve, reject) => {
    conn.createChannel((err, ch) => {
      if (err) {
        console.error('Erro ao criar fila', err)
        reject(err)
      }

      resolve(ch)
    })
  })
}

function closeChannel(ch = {}) {
  setTimeout(() => {
    ch.close()
  }, 1000)
}
