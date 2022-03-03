import mongodb from 'mongodb'

export function mongoIdIsValid(id = null) {
  return mongodb.ObjectID.isValid(id)
}

export function validateEmail(email) {
  if (!email) return false
  const emailParts = email.split('.')
  if ((email.match(/@/g) || []).length > 1) return false
  if (emailParts[emailParts.length - 1].length > 3) return false

  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w+)+$/
  return re.test(String(email).trim().toLowerCase())
}

export function isArrayObject(array) {
  let isArrayObject = true
  if (!Array.isArray(array)) isArrayObject = false
  else {
    array.forEach((item) => {
      if (typeof item !== 'object') {
        isArrayObject = false
      }
    })
  }

  return isArrayObject
}

export function isArrayElementSameTypes(array) {
  const arrayElementTypes = typeof array[0]
  let arrayElementSameTypes = true

  array.forEach((item) => {
    if (typeof item !== arrayElementTypes) {
      arrayElementSameTypes = false
    }
  })

  return arrayElementSameTypes
}

export function isArrayOfObjects(array) {
  let arrayOfObjects = false

  array.forEach((item) => {
    if (typeof item === 'object') {
      arrayOfObjects = true
    }
  })

  return arrayOfObjects
}

export function isArrayWithEmptyElement(array) {
  let hasEmptyElement = false

  array.forEach((item) => {
    if (String(item).trim().length === 0) {
      hasEmptyElement = true
    }
  })

  return hasEmptyElement
}

export function arraysEqual(source1, source2) {
  const cpSource1 = source1.map((s) => s.trim())
  const cpSource2 = source2.map((s) => s.trim())
  return cpSource1.sort().toString() === cpSource2.sort().toString()
}

export function arraysDiff(arr1, arr2) {
  const filteredArr1 = arr1.filter(function (ele) {
    return arr2.indexOf(ele) === -1
  })

  const filteredArr2 = arr2.filter(function (ele) {
    return arr1.indexOf(ele) === -1
  })
  const arrDiff = filteredArr1.concat(filteredArr2)

  return arrDiff
}

export function listElementDuplicated(arr) {
  const counts = {}
  arr.forEach((x) => {
    counts[x] = (counts[x] || 0) + 1
  })
  return Object.keys(counts).filter((k) => counts[k] > 1)
}
