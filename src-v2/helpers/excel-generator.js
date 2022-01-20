const ExcelJS = require('exceljs')

async function generateExcel(header = [], data = [], filename = '') {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Dados')

  sheet.columns = header

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    sheet.addRow(d)
  }

  await workbook.xlsx.writeFile(filename)
}

module.exports = { generateExcel }
