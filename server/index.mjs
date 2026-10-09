import { createApp } from './app.mjs'
const { app, close } = await createApp()
const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Pixelpaper server must bind to loopback.')
const server = app.listen(port, host, () => console.log(`Pixelpaper API and app: http://${host}:${port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { close(); server.close(() => process.exit(0)) })
