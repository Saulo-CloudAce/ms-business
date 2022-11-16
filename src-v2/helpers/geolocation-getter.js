import BuscaCEPService from '../services/buscacep-service.js'
import ProjectOSRMService from '../services/project-osrm-service.js'

const buscaCepService = new BuscaCEPService()
const projectOsrmService = new ProjectOSRMService()

export async function getGeolocationDataFromCEPs(cepSource = '', cepTarget = '') {
  try {
    const c1 = await buscaCepService.getCoordinatesFromCEP(cepSource)
    const c2 = await buscaCepService.getCoordinatesFromCEP(cepTarget)

    const distanceInKm = await projectOsrmService.getDistance([c1, c2])

    const geoData = {
      lat_source: c1.lat,
      long_source: c1.long,
      lat_target: c2.lat,
      long_target: c2.long,
      distance_in_km: distanceInKm
    }
    return geoData
  } catch (err) {
    console.error('Error on get geolocation data. Error: ', err)
    return { error: 'Ocorreu erro ao buscar os dados de gelocalização' }
  }
}
