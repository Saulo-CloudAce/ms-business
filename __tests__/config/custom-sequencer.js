import Sequencer from '@jest/test-sequencer'

export default class CustomSequencer extends Sequencer.default {
  sort(tests) {
    const orderPath = [
      'query-predicate.test.js',
      'company-router.test.js',
      'template-router.test.js',
      'business-router.test.js',
      'customer-router.test.js'
    ]

    const testsInOrder = []
    const copyTests = Array.from(tests)

    for (let i = 0; i < orderPath.length; i++) {
      for (let j = 0; j < copyTests.length; j++) {
        const testSplit = copyTests[j].path.split('/')
        const testFile = testSplit[testSplit.length - 1]

        if (testFile === orderPath[i]) {
          testsInOrder.push(copyTests[j])
        }
      }
    }

    return testsInOrder
  }
}
