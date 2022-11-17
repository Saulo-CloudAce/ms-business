import BuscaCEPService from '../services/buscacep-service.js'
import GoogleMapsService from '../services/google-maps-service.js'
import ProjectOSRMService from '../services/project-osrm-service.js'

const buscaCepService = new BuscaCEPService()
const projectOsrmService = new ProjectOSRMService()
const googleMapsService = new GoogleMapsService()

export async function getGeolocationDataFromCEPs(cepSource = '', cepTarget = '') {
  try {
    const coordinates = await getCoordinates(cepSource, cepTarget)
    if (coordinates.error) {
      return coordinates
    }

    let distance = await getDistanceOSRM([coordinates.source, coordinates.target])
    if (distance.error) {
      distance = await getDistanceGoogleMaps(cepSource, cepTarget)
    }

    if (distance.error) {
      return distance
    }

    const geoData = {
      lat_source: coordinates.source.lat,
      long_source: coordinates.source.long,
      lat_target: coordinates.target.lat,
      long_target: coordinates.target.long,
      distance_in_km: distance.distanceInKm
    }
    return geoData
  } catch (err) {
    console.error('Error on get geolocation data. Error: ', err)
    return { error: 'Ocorreu erro ao buscar os dados de gelocalização' }
  }
}

async function getDistanceGoogleMaps(cepSource = '', cepTarget = '') {
  try {
    console.info('get distance google maps')
    const distanceInKm = await googleMapsService.getDistance(cepSource, cepTarget)
    return { distanceInKm }
  } catch (err) {
    console.error(err)
    return { error: 'Ocorreu erro ao buscar a distancia pelos ceps' }
  }
}

async function getDistanceOSRM(coordinates = []) {
  try {
    console.info('get distance project osrm')
    const distanceInKm = await projectOsrmService.getDistance(coordinates)
    return { distanceInKm }
  } catch (err) {
    console.error(err)
    return { error: 'Ocorreu erro ao buscar a distancia pelas coordenadas' }
  }
}

async function getCoordinates(cepSource = '', cepTarget = '') {
  try {
    const c1 = await buscaCepService.getCoordinatesFromCEP(cepSource)
    const c2 = await buscaCepService.getCoordinatesFromCEP(cepTarget)

    return { source: c1, target: c2 }
  } catch (err) {
    console.error(err)
    return { error: 'Ocorreu erro ao pegar as coordenadas' }
  }
}
