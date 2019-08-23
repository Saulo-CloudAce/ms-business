function validateFields (fields) {
  return fields.map(f => {
    if (!f.key) f.key = false
    if (!f.required) f.required = false
    if (!f.editable) f.editable = false
    if (!f.operatorCanView) f.operator_can_view = true
    return f
  })
}

module.exports = { validateFields }
