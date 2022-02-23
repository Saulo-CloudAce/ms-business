export const createSpec = {
  name: {
    isLength: {
      errorMessage: 'O nome é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  },
  fields: {
    isLength: {
      errorMessage: 'Os fields são obrigatórios',
      options: {
        min: 1
      }
    }
  }
}

export const updateSpec = {
  name: {
    isLength: {
      errorMessage: 'O nome é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  },
  fields: {
    isLength: {
      errorMessage: 'Os fields são obrigatórios',
      options: {
        min: 1
      }
    }
  }
}
