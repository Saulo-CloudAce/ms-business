export const createSpec = {
  customer_cpfcnpj: {
    isLength: {
      errorMessage: 'O CPF/CNPJ é obrigatório',
      options: {
        min: 1,
        max: 18
      }
    }
  }
}

export const updateSpec = {
  customer_cpfcnpj: {
    isLength: {
      errorMessage: 'O CPF/CNPJ é obrigatório',
      options: {
        min: 1,
        max: 18
      }
    }
  }
}
