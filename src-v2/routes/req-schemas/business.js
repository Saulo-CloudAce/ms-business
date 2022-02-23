export const createFromJSONSpec = {
  name: {
    isLength: {
      errorMessage: 'O nome é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  },
  templateId: {
    isLength: {
      errorMessage: 'O ID do template é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  },
  data: {
    isLength: {
      errorMessage: 'Os dados são obrigatórios.',
      options: {
        min: 1
      }
    }
  },
  active_until: {
    isLength: {
      errorMessage: 'O active until é obrigatório',
      options: {
        min: 1,
        max: 255
      }
    }
  }
}
