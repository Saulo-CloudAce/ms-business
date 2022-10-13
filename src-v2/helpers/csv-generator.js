import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'
export async function generateCSV(header = [], data = [], filename = '') {
  try {
    console.time('CSV gerado')
    const csvWriter = createCsvWriter({
      path: filename,
      header
    })
    csvWriter.writeRecords(data)
    console.timeEnd('CSV gerado')
  } catch (err) {
    console.error(err)
    return { error: 'Ocorreu erro ao tentar gerar o arquivo CSV.' }
  }
}
