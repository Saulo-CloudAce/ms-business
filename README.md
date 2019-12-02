# CRM
### Conceitos
- **Dados de negócio**: são todos os dados que não se referem ao cliente em si, mas aos produtos ou informações que ele usa.
- **Dados de cadastro**: são todos os dados cadastrais do cliente como nome, CPF/CNPJ, gênero e etc.
- **Dados de contato**: são todos os dados que permitem contactar o cliente como telefone, e-mail, endereço e etc.

### Arquitetura
O CRM como um serviço abrange dois microserviços: [**ms-business**](https://github.com/estanisquevedo/ms-business) e [**ms-crm**](https://github.com/estanisquevedo/ms-crm).



#### ms-business
Este microserviço salva os dados no MongoDB e guarda os arquivos de lotes enviados no S3.
Tem as sequintes responsabilidades:
1. Gerenciar as campanies
2. Gerenciar os templates
3. Receber, tratar e guardar os lotes de dados originais e tratados
4. Fazer proxying como microserviço ms-crm, sendo que nenhuma requisição chega diretamente no ms-crm, antes precisa obrigatoriamente passar pelo ms-business

#### ms-crm
Este microserviço salva os dados no PostgreSQL e mantém dados resumidos no ElasticSearch para realizar search dos clientes sem precisar bater no banco de dados diretamente.
A única responsabilidade é manter os dados de cadastro e contato dos clientes.

[Mais detalhes](https://github.com/estanisquevedo/ms-crm/blob/master/README.md)

### Sobre o ms-business
Para realizar qualquer ação é necessário enviar um token de identificação da company relacionada no header da requisição, exceto quando realiza alguma ação relacionada a company.
Para ter um token é preciso cadastrar uma company, com o seguinte método

Endpoint: POST /api/v1/companies
Content-type: application/json

Parâmetros
| Parâmetro | Descrição       | Obrigatório |
| --------- | ---------       | ----------- |
| name      | Nome da company | SIM|
| prefix_index_elastic| Prefixo para indexar os dados no ElasticSearch|SIM|
| callback| URL retorno após alguma chamada assíncrona|SIM|
