const fs = require("fs");
const {
  validateFields,
  validateKey,
  hasCustomerFields,
} = require("../lib/template-validator");
const CompanyRepository = require("../repository/company-repository");
const TemplateRepository = require("../repository/template-repository");
const BusinessRepository = require("../repository/business-repository");
const { mongoIdIsValid } = require("../helpers/validators");
const { isTypeArray } = require("../helpers/field-methods");
const { isArrayObject } = require("../helpers/validators");
const { generateCSV } = require("../helpers/csv-generator");
const { sendEmail } = require("../helpers/email-sender");

class TemplateController {
  _getInstanceRepositories(app) {
    const companyRepository = new CompanyRepository(app.locals.db);
    const templateRepository = new TemplateRepository(app.locals.db);
    const businessRepository = new BusinessRepository(app.locals.db);

    return { companyRepository, templateRepository, businessRepository };
  }

  async create(req, res) {
    req.assert("name", "O nome é obrigatório").notEmpty();
    req.assert("fields", "Os fields são obrigatórios").notEmpty();

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() });
    }

    const companyToken = req.headers["token"];

    let createdBy = 0

    try {
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      const { name, fields } = req.body;
      if (req.body.created_by && !isNaN(req.body.created_by)) {
        createdBy = parseInt(req.body.created_by)
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const templatesCreated = await templateRepository.getAllByName(
        name,
        companyToken
      );
      if (templatesCreated.length > 0) {
        return res.status(400).send({ error: `(${name}) já foi cadastrado.` });
      }

      if (hasCustomerFields(fields)) {
        const keyValidated = validateKey(fields);
        if (!keyValidated) {
          return res
            .status(400)
            .send({ error: "Defina um campo do template como chave" });
        }
      }

      const fieldsValidated = validateFields(fields);

      if (fieldsValidated.errors.length) {
        return res.status(400).send({ errors: fieldsValidated.errors });
      }

      const template = await templateRepository.save(
        name,
        fieldsValidated.fields,
        companyToken,
        true,
        createdBy
      );

      return res.status(201).send(template);
    } catch (err) {
      console.error("CREATE TEMPLATE ==>", err);
      return res.status(500).send({ error: "Erro ao criar o template" });
    }
  }

  async activateTemplate(req, res) {
    const companyToken = req.headers["token"];
    const templateId = req.params.id;

    let updatedBy = 0

    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = req.body.updated_by
    }

    try {
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const template = await templateRepository.getNameById(
        templateId,
        companyToken
      );
      if (!template) {
        return res.status(400).send({ error: "Template não identificado" });
      }

      await templateRepository.updateActive(templateId, true, updatedBy);

      return res.status(200).send(template);
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: err.message });
    }
  }

  async deactivateTemplate(req, res) {
    const companyToken = req.headers["token"];
    const templateId = req.params.id;

    let updatedBy = 0

    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = req.body.updated_by
    }

    try {
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const template = await templateRepository.getNameById(
        templateId,
        companyToken
      );
      if (!template) {
        return res.status(400).send({ error: "Template não identificado" });
      }

      await templateRepository.updateActive(templateId, false, updatedBy);

      return res.status(200).send(template);
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: err.message });
    }
  }

  async getDataByTemplateId(req, res) {
    const companyToken = req.headers["token"];
    const templateId = req.params.id;

    try {
      const { companyRepository, templateRepository, businessRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const template = await templateRepository.getNameById(
        templateId,
        companyToken
      );
      if (!template) {
        return res.status(400).send({ error: "Template não identificado" });
      }

      const businessData =
        await businessRepository.listAllBatchesAndChildsByTemplate(
          companyToken,
          templateId
        );
      businessData.forEach((bd) => delete bd.childBatchesId);
      template.data = businessData;

      return res.status(200).send(template);
    } catch (err) {
      return res.status(500).send({ error: err.message });
    }
  }

  async exportDataByTemplateId(req, res) {
    const companyToken = req.headers["token"];
    const templateId = req.params.id;
    const email = req.query.email;
    if (!email) {
      return res.status(400).send({
        error: "Informe um e-mail para enviar o arquivo com os dados",
      });
    }

    try {
      const { companyRepository, templateRepository, businessRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const template = await templateRepository.getNameById(
        templateId,
        companyToken
      );
      if (!template) {
        return res.status(400).send({ error: "Template não identificado" });
      }

      res.status(200).send({
        message:
          "Estamos processando os dados e enviaremos uma planilha para o e-mail informado.",
      });

      const businessData =
        await businessRepository.listAllBatchesAndChildsByTemplateId(
          companyToken,
          templateId
        );

      const records = [];
      businessData.forEach((bd) => {
        records.push(...bd.data);
      });

      if (records.length === 0) {
        console.log("Template sem dados para exportar");
        return;
      }

      const header = Object.keys(records[0]).map((k) => {
        return { id: `${k}`, title: `${k}` };
      });

      const filename = `${template.name}.csv`;
      const filepath = `/tmp/${filename}`;

      generateCSV(header, records, filepath).then(
        setTimeout(() => {
          const result = sendEmail(email, filepath, filename);
          if (result.error) {
            console.error(
              "Ocorreu erro ao enviar o e-mail com o arquivo gerado."
            );
          } else {
            console.log("E-mail enviado com CSV gerado.");
          }
          fs.unlink(filepath, (err) => {
            if (err) console.error("Ocorreu erro ao excluir o CSV gerado.");
            else console.log("Arquivo CSV excluido.");
          });
        }, 5000)
      );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ error: "Ocorreu erro ao exportar os dados para arquivo CSV." });
    }
  }

  async getAll(req, res) {
    const companyToken = req.headers["token"];

    try {
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const templates = await templateRepository.getAllByCompany(companyToken);

      return res.status(200).send(templates);
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: err.message });
    }
  }

  async getById(req, res) {
    const companyToken = req.headers["token"];
    const templateId = req.params.id;

    try {
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const template = await templateRepository.getById(
        templateId,
        companyToken
      );

      return res.status(200).send(template);
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: err.message });
    }
  }

  async update(req, res) {
    req.assert("name", "O nome é obrigatório").notEmpty();
    req.assert("fields", "Os fields são obrigatórios").notEmpty();

    const companyToken = req.headers["token"];
    const templateId = req.params.id;

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() });
    }

    try {
      const { name, fields } = req.body;
      let updatedBy = 0

      if (req.body.updated_by && !isNaN(req.body.updated_by)) {
        updatedBy = req.body.updated_by
      }
      const { companyRepository, templateRepository } =
        this._getInstanceRepositories(req.app);

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: "ID não válido" });
      }

      const company = await companyRepository.getByToken(companyToken);
      if (!company) {
        return res.status(400).send({ error: "Company não identificada." });
      }

      const templatesCreated =
        await templateRepository.getAllByNameWhereIdNotIs(
          name,
          companyToken,
          templateId
        );
      if (templatesCreated.length) {
        return res.status(400).send({ error: `(${name}) já foi cadastrado.` });
      }

      const templateSaved = await templateRepository.getById(
        templateId,
        companyToken
      );
      if (!templateSaved) {
        return res.status(400).send({ error: "Template não existente" });
      }

      templateSaved.name = name;

      templateSaved.fields.forEach((field) => {
        const updateField = fields.find((f) => f.column === field.column);
        if (updateField.label.length && updateField.label !== field.label) {
          field.label = updateField.label;
        }
        field.visible = updateField.visible;
        field.has_tab = updateField.has_tab;
        field.operator_can_view = updateField.operator_can_view;
        if (!field.key) {
          field.required = updateField.required;
          field.editable = updateField.editable;
        }
        if (updateField.mask) field.mask = updateField.mask;
        if (isTypeArray(field) && isArrayObject(field.fields)) {
          field.fields.forEach((subfield) => {
            const updateSubfield = updateField.fields.find(
              (sf) => sf.column === subfield.column
            );
            if (
              updateSubfield.label.length &&
              updateSubfield.label !== subfield.label
            ) {
              subfield.label = updateSubfield.label;
            }
            subfield.visible = updateSubfield.visible;
            subfield.has_tab = updateSubfield.has_tab;
            subfield.operator_can_view = updateSubfield.operator_can_view;
            subfield.required = updateSubfield.required;
            subfield.editable = updateSubfield.editable;
            if (updateSubfield.mask) subfield.mask = updateSubfield.mask;
          });
        }
      });

      const template = await templateRepository.update(
        templateId,
        companyToken,
        templateSaved,
        updatedBy
      );

      return res.status(200).send(template);
    } catch (err) {
      console.log(err);
      return res.status(500).send({ error: err.message });
    }
  }
}

module.exports = TemplateController;
