import sgMail from '@sendgrid/mail'
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
import fs from 'fs'

export async function sendEmail(emailTo = '', filepath = '', filename = '') {
  const pathAttachment = filepath
  const attachment = fs.readFileSync(pathAttachment).toString('base64')

  try {
    const msg = {
      to: emailTo,
      from: process.env.SENDGRID_SENDER_EMAIL, // Change to your verified sender
      subject: 'Relatório de dados do CRM',
      text: 'Segue em anexo o relatório de dados do CRM',
      attachments: [
        {
          content: attachment,
          filename,
          type: 'application/vnd.ms-excel',
          disposition: 'attachment'
        }
      ]
    }

    await sgMail.send(msg)
  } catch (err) {
    console.error(err.response.body)
    return { error: 'Ocorreu erro ao enviar o e-mail.' }
  }
}

export async function sendEmailBussinessError(emailTo = '', filepath = '', filename = '') {
  const pathAttachment = filepath
  const attachment = fs.readFileSync(pathAttachment).toString('base64')

  try {
    const msg = {
      to: emailTo,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: 'Relatório de erros na importação do mailing',
      text: 'Segue em anexo o relatório de erros que ocorreram na importação do mailing.',
      attachments: [
        {
          content: attachment,
          filename,
          type: 'application/vnd.ms-excel',
          disposition: 'attachment'
        }
      ]
    }

    await sgMail.send(msg)
  } catch (err) {
    console.error(err.response.body)
    return { error: 'Ocorreu erro ao enviar o e-mail.' }
  }
}
