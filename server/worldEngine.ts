/**
 * World Engine — Express server exposing simulation state via HTTP API.
 * Runs on port 8000 (configurable via ENGINE_PORT env var).
 */

import express from 'express'
import { initWorld, tick, getWorldState, getMoments, queueMessage } from './engine/simulation.js'

const app = express()
const PORT = parseInt(process.env.ENGINE_PORT || '8000', 10)
const USE_AI = process.env.USE_AI === 'true'
const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL || (USE_AI ? '10000' : '3000'), 10)

// CORS
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return }
  next()
})

app.use(express.json())

// GET /world — full world state
app.get('/world', (_req, res) => {
  res.json(getWorldState())
})

// GET /moments — social feed
app.get('/moments', (_req, res) => {
  res.json(getMoments())
})

// GET /bot/:id/detail — bot detail
app.get('/bot/:id/detail', (req, res) => {
  const world = getWorldState()
  const bot = world.bots[req.params.id]
  if (!bot) { res.status(404).json({ error: 'Bot not found' }); return }
  res.json(bot)
})

// POST /admin/send_message — send message to a bot
app.post('/admin/send_message', (req, res) => {
  const { from, to, message } = req.body || {}
  if (!from || !to || !message) {
    res.status(400).json({ error: 'Missing from, to, or message' })
    return
  }
  const world = getWorldState()
  if (!world.bots[to]) {
    res.status(404).json({ error: `Bot ${to} not found` })
    return
  }
  queueMessage(from, to, message)
  console.log(`[engine] Message from "${from}" to "${to}": ${message}`)
  res.json({ ok: true })
})

// Initialize and start
initWorld()

const tickTimer = setInterval(() => {
  tick()
  const state = getWorldState()
  if (state.time.tick % 10 === 0) {
    const aliveBots = Object.values(state.bots).filter(b => b.status === 'alive')
    const locs = new Set(aliveBots.map(b => b.location))
    console.log(`[engine] tick=${state.time.tick} hour=${state.time.virtual_hour} day=${state.time.virtual_day} weather=${state.weather.current} bots_alive=${aliveBots.length} locations_active=${locs.size} moments=${getMoments().length}`)
  }
}, TICK_INTERVAL)

app.listen(PORT, () => {
  console.log(`[engine] World Engine running on http://localhost:${PORT}`)
  console.log(`[engine] Tick interval: ${TICK_INTERVAL}ms`)
  console.log(`[engine] Endpoints: GET /world, GET /moments, POST /admin/send_message`)
})

process.on('SIGINT', () => {
  clearInterval(tickTimer)
  console.log('\n[engine] Shutting down...')
  process.exit(0)
})
