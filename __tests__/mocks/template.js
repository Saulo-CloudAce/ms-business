export const templateExample5 = {
  name: 'template simples - 5',
  fields: [
    {
      type: 'string',
      column: 'name',
      data: 'customer_name',
      label: 'Nome',
      key: false,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'cpfcnpj',
      column: 'cpf_cnpj',
      data: 'customer_cpfcnpj',
      label: 'CPF/CNPJ',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'string',
      column: 'produto',
      data: 'produto',
      label: 'Produto',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'int',
      column: 'idade',
      data: 'idade',
      label: 'Idade',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    }
  ],
  active: false
}

export const templateExample6 = {
  name: 'template simples - 6',
  fields: [
    {
      type: 'string',
      column: 'name',
      data: 'customer_name',
      label: 'Nome',
      key: false,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'cpfcnpj',
      column: 'cpf_cnpj',
      data: 'customer_cpfcnpj',
      label: 'CPF/CNPJ',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'string',
      column: 'produto',
      data: 'produto',
      label: 'Produto',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'int',
      column: 'idade',
      data: 'idade',
      label: 'Idade',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    }
  ],
  active: false
}

export const templateExample7 = {
  name: 'template simples - 7',
  fields: [
    {
      type: 'string',
      column: 'name',
      data: 'customer_name',
      label: 'Nome',
      key: false,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'cpfcnpj',
      column: 'cpf_cnpj',
      data: 'customer_cpfcnpj',
      label: 'CPF/CNPJ',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'string',
      column: 'produto',
      data: 'produto',
      label: 'Produto',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'int',
      column: 'idade',
      data: 'idade',
      label: 'Idade',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    }
  ],
  active: false
}

export function getMailingExample(companyToken = '', templateId = '') {
  const mailing = {
    companyToken: companyToken,
    name: 'Mailing teste 1',
    filePath: '',
    templateId: templateId,
    quantityRows: 3,
    fieldsData: [
      {
        name: 'Cliente 1',
        cpf_cnpj: '00000000001',
        produto: 'Alfinete',
        idade: 10
      },
      {
        name: 'Cliente 2',
        cpf_cnpj: '00000000002',
        produto: 'Mouse',
        idade: 20
      },
      {
        name: 'Cliente 3',
        cpf_cnpj: '00000000003',
        produto: 'Abóbora',
        idade: 35
      }
    ]
  }

  return mailing
}
