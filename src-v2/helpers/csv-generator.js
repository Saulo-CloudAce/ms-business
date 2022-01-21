const createCsvWriter = require('csv-writer').createObjectCsvWriter
async function generateCSV(header = [], data = [], filename = '') {
  try {
    const csvWriter = createCsvWriter({
      path: filename,
      header
    })
    csvWriter.writeRecords(data)
    console.log('CSV gerado')
  } catch (err) {
    console.error(err)
    return { error: 'Ocorreu erro ao tentar gerar o arquivo CSV.' }
  }
}
module.exports = {
  generateCSV
}
