import QueryPredicate from '../../src-v2/repository/query-predicate.js'

const templateExample = {
  name: 'Template Teste',
  fields: [
    {
      column: 'name',
      type: 'string'
    },
    {
      column: 'age',
      type: 'int'
    }
  ]
}

describe('Query predicate unit tests', () => {
  it('Should return when rules group is empty', (done) => {
    const qp = new QueryPredicate([], templateExample)

    expect(qp.isEmpty()).toBe(true)

    done()
  })

  it('Should return when rules group is not an array', (done) => {
    const t = () => {
      new QueryPredicate({}, templateExample)
    }

    expect(t).toThrow(new Error('O grupo de regras deve ser um array'))

    done()
  })

  it('Should throw error when rules group not has main condition', (done) => {
    const filterRules = [{ rules: [{ condition: 'EQUAL', field: 'name', value: 'John Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rules group not has valid main condition', (done) => {
    const filterRules = [{ condition: 'XOR', rules: [{ condition: 'EQUAL', field: 'name', value: 'John Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rules group not has rules set', (done) => {
    const filterRules = [{ condition: 'AND' }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rules group has empty rules set', (done) => {
    const filterRules = [{ condition: 'AND', rules: [] }, { condition: 'OR' }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule not has condition', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ field: 'name', value: 'Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule not has field', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ condition: 'EQUAL', value: 'Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule field not relate to field on template', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ condition: 'EQUAL', field: 'produto', value: 'Teclado' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule not has value', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ condition: 'EQUAL', field: 'name' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule not has valid condition', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ condition: 'MORE_LESS', field: 'name', value: 'John Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rule value not is compative with field template`s type', (done) => {
    const filterRules = [{ condition: 'AND', rules: [{ condition: 'EQUAL', field: 'age', value: 'John Doe' }] }]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should throw error when rules group has ONLY condition but has more than one rules set', (done) => {
    const filterRules = [
      {
        condition: 'ONLY',
        rules: [
          { condition: 'EQUAL', field: 'name', value: 'John Doe' },
          { condition: 'LESS_THAN', field: 'age', value: 10 }
        ]
      }
    ]

    const t = () => {
      new QueryPredicate(filterRules, templateExample)
    }

    expect(t).toThrow(Error)

    done()
  })

  it('Should return a query with only a criteria', (done) => {
    const filterRules = [
      {
        condition: 'ONLY',
        rules: [{ condition: 'EQUAL', field: 'name', value: 'John Doe' }]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ name: { $regex: 'John Doe', $options: 'i' } }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })

  it('Should return a query with two criterias when use AND condition', (done) => {
    const filterRules = [
      {
        condition: 'AND',
        rules: [
          { condition: 'EQUAL', field: 'name', value: 'John Doe' },
          { condition: 'EQUAL', field: 'age', value: '10' }
        ]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ $and: [{ name: { $regex: 'John Doe', $options: 'i' } }, { age: 10 }] }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })

  it('Should return a query with two criterias when use OR condition', (done) => {
    const filterRules = [
      {
        condition: 'OR',
        rules: [
          { condition: 'EQUAL', field: 'name', value: 'John Doe' },
          { condition: 'EQUAL', field: 'age', value: 10 }
        ]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ $or: [{ name: { $regex: 'John Doe', $options: 'i' } }, { age: 10 }] }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })

  it('Should return a query with an criteria using DIFFERENT condition', (done) => {
    const filterRules = [
      {
        condition: 'ONLY',
        rules: [{ condition: 'DIFFERENT', field: 'name', value: 'John Doe' }]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ name: { $ne: 'John Doe' } }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })

  it('Should return a query with an criteria using GREATER_THAN condition', (done) => {
    const filterRules = [
      {
        condition: 'ONLY',
        rules: [{ condition: 'GREATER_THAN', field: 'age', value: 10 }]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ age: { $gte: 10 } }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })

  it('Should return a query with an criteria using LESS_THAN condition', (done) => {
    const filterRules = [
      {
        condition: 'ONLY',
        rules: [{ condition: 'LESS_THAN', field: 'age', value: 10 }]
      }
    ]
    const qp = new QueryPredicate(filterRules, templateExample)

    const queryExpected = [{ age: { $lte: 10 } }]

    const queryGenerated = qp.generateMongoQuery()

    expect(queryGenerated).toMatchObject(queryExpected)

    done()
  })
})
