import axios from 'axios'
export default class GoogleMapsService {
  async getDistance(cepSource = '', cepTarget = '') {
    const key = `${process.env.GOOGLE_MAPS_API_KEY}`
    const result = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?destinations=${cepTarget}&origins=${cepSource}&key=${key}`
    )
    const data = result.data
    const distanceInKm = parseFloat((data.rows[0].elements[0].distance.value / 1000).toFixed(2))
    return distanceInKm
  }
}
