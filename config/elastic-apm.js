function init(serviceName = '', serverUrl = '') {
  if (serviceName.length === 0 || serverUrl.length === 0) return

  return apm = require('elastic-apm-node').start({
    serviceName,
    serverUrl
  })
}

module.exports = init
