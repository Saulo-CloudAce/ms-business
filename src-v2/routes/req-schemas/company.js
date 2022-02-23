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
  prefix_index_elastic: {
    isLength: {
      errorMessage: 'O prefix index elastic é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  },
  callback: {
    isLength: {
      errorMessage: 'A URL de callback é obrigatória',
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
  activated: {
    isLength: {
      errorMessage: 'O activated é obrigatório',
      options: {
        min: 1
      }
    }
  },
  callback: {
    isLength: {
      errorMessage: 'A URL de callback é obrigatória',
      options: {
        min: 1
      }
    }
  }
}
