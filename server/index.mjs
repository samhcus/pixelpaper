import { createApp } from './app.mjs'
const { app, close } = await createApp()
const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'
const server = app.listen(port, host, () => console.log(`Wallpapers API and app: http://${host}:${port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { close(); server.close(() => process.exit(0)) })
