import axios from 'axios'
import cheerio from 'cheerio'

export default class BuscaCEPService {
  async getCoordinatesFromCEP(cep = '') {
    const result = await axios.get(`https://www.qualocep.com/busca-cep/${cep}`)
    const page = result.data
    const $ = cheerio.load(page)
    const text = $('h4').text()
    const textParts = text.split('/')
    const lat = parseFloat(textParts[0].replace('Latitude:', '').trim())
    const long = parseFloat(textParts[1].replace('Longitude:', '').trim())
    const coordinates = { lat, long }

    return coordinates
  }
}
