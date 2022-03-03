import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'
export async function generateCSV(header = [], data = [], filename = '') {
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
