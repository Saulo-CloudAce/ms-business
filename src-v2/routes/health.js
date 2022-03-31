export default function healthRoute(app) {
  app.get('/api/v1/health', (req, res) => res.json({ status: 'Ok' }))
}
