import axios from 'axios'

export default class ProjectOSRMService {
  async getDistance(coordinates = []) {
    const points = coordinates
      .map((c) => {
        return `${c.long},${c.lat}`
      })
      .join(';')
    const result = await axios.get(`http://router.project-osrm.org/route/v1/driving/${points}?overview=false`)
    const data = result.data
    const distanceInMeters = data.routes[0].legs[0].distance
    const distanceInKm = distanceInMeters / 1000
    return parseFloat(distanceInKm.toFixed(2))
  }
}
