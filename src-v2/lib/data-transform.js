function normalizeArraySubfields (templateData = [], template = {}) {
    const fieldArrayList = template.fields.filter(f => f.type === 'array')
    
    if (fieldArrayList.length === 0) return templateData

    const templateDataNormalized = []
    for (let batch of templateData) {
      const data = batch.data
      let dataNormalized = data
      for (let field of  fieldArrayList) {
        let firstItemArray = data[0][field.column]
        if (firstItemArray && firstItemArray.length > 0) {
            firstItemArray = firstItemArray[0]

            const dataFirstField = field.fields[0].data
            if (firstItemArray[dataFirstField]) {
            dataNormalized = normalizeField(dataNormalized, field)
            }
        }
      }
      const loteNormalized = batch
      loteNormalized.data = dataNormalized
      templateDataNormalized.push(loteNormalized)
    }

    return templateDataNormalized
}

function normalizeField (dataList = [], arrayField = {}) {
    const dataNormalizaded = []
    const cacheArrayFields = {}

    arrayField.fields.forEach(f => {
      cacheArrayFields[f.data] = f.column
    })

    for (let i in dataList) {
      let row = dataList[i]
      
      row[arrayField.column] = row[arrayField.column].map(k => {
        const n = {}
        Object.keys(cacheArrayFields).forEach(c => {
          const column = cacheArrayFields[c]
          const data = c
          n[column] = k[data]
        })
        return n
      })

      dataNormalizaded.push(row)
    }

    return dataNormalizaded
}

module.exports = { normalizeArraySubfields, normalizeField }