export default function healthRoute(app) {
  app.get('/api/v2/health', (req, res) => res.json({ status: 'Ok' }))
}
