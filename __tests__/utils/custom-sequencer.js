const TestSequencer = require('@jest/test-sequencer').default

class CustomSequencer extends TestSequencer {
  sort (tests) {
    const orderPath = [
      'company'
    ]
    return tests.sort((testA, testB) => {
      let filenameA = testA.path.split('/')
      filenameA = filenameA[filenameA.length - 1]
      let filenameB = testB.path.split('/')
      filenameB = filenameB[filenameB.length - 1]
      const indexA = orderPath.indexOf(filenameA.split('-')[0])
      const indexB = orderPath.indexOf(filenameB.split('-')[0])

      if (indexA === indexB) return 0 // do not swap when tests both not specify in order.

      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA < indexB ? -1 : 1
    })
  }
}

module.exports = CustomSequencer
