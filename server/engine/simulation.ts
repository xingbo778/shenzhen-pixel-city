/**
 * Simulation core — tick loop and state management.
 */

import type { WorldState, Moment } from './seedData.js'
import { createInitialWorldState, createInitialMoments } from './seedData.js'
import { updateBot } from './botBehavior.js'
import { maybeUpdateWeather } from './weatherSystem.js'
import { maybeGenerateMoment } from './momentGenerator.js'
import { maybeGenerateNews, maybeGenerateEvent, maybeRotateHotTopics } from './newsGenerator.js'
import { processMessages, queueMessage as queueMsg } from './messageHandler.js'
import { getAIBotIds, getAIDecision, applyDecision } from './aiDecision.js'

const USE_AI = process.env.USE_AI === 'true'
const AI_BOTS_PER_TICK = parseInt(process.env.AI_BOTS_PER_TICK || '1', 10)

let worldState: WorldState
let moments: Moment[]

export function initWorld(): void {
  worldState = createInitialWorldState()
  moments = createInitialMoments()
  console.log(`[engine] World initialized with ${Object.keys(worldState.bots).length} bots, ${Object.keys(worldState.locations).length} locations`)
  console.log(`[engine] AI mode: ${USE_AI ? `ON (${AI_BOTS_PER_TICK} bots/tick via Claude CLI)` : 'OFF (rule-based)'}`)
}

export function tick(): void {
  worldState.time.tick++
  worldState.time.virtual_hour = worldState.time.tick % 24
  worldState.time.virtual_day = Math.floor(worldState.time.tick / 24) + 1
  const day = worldState.time.virtual_day
  const hour = worldState.time.virtual_hour
  worldState.time.virtual_datetime = `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`

  // Update weather
  worldState.weather = maybeUpdateWeather(worldState.weather, worldState.time.tick)

  // Update each bot (AI-driven for selected bots, rule-based for the rest)
  const aliveBotIds = Object.keys(worldState.bots).filter(id => worldState.bots[id].status === 'alive')
  const aiBotIds = USE_AI ? new Set(getAIBotIds(aliveBotIds, AI_BOTS_PER_TICK)) : new Set<string>()

  for (const botId of aliveBotIds) {
    const bot = worldState.bots[botId]

    if (aiBotIds.has(botId)) {
      const decision = getAIDecision(bot, worldState)
      if (decision) {
        applyDecision(bot, decision, worldState.time.tick, moments, worldState.bots)
        console.log(`[ai] ${bot.name}: ${decision.activity}${decision.move_to ? ` → ${decision.move_to}` : ''}`)
        continue
      }
      // AI failed, fall back to rules
    }

    worldState.bots[botId] = updateBot(bot, worldState, worldState.time.tick)
  }

  // Rebuild location.bots arrays from bot locations
  for (const locName of Object.keys(worldState.locations)) {
    worldState.locations[locName].bots = []
  }
  for (const bot of Object.values(worldState.bots)) {
    if (bot.status === 'alive' && worldState.locations[bot.location]) {
      worldState.locations[bot.location].bots.push(bot.id)
    }
  }

  // Generate moments
  for (const bot of Object.values(worldState.bots)) {
    if (bot.status !== 'alive') continue
    const moment = maybeGenerateMoment(bot, worldState.time.tick, worldState.bots)
    if (moment) {
      moments.push(moment)
      // Update location public_memory
      const loc = worldState.locations[bot.location]
      if (loc) {
        loc.public_memory.push({
          event: `${bot.name}${bot.current_activity}`,
          actor: bot.id,
          tick: worldState.time.tick,
          impact: 'low',
        })
        if (loc.public_memory.length > 10) loc.public_memory = loc.public_memory.slice(-10)
      }
    }
  }
  if (moments.length > 100) moments = moments.slice(-100)

  // Generate news
  const news = maybeGenerateNews(worldState, worldState.time.tick)
  if (news) {
    worldState.news_feed.unshift(news)
    if (worldState.news_feed.length > 20) worldState.news_feed = worldState.news_feed.slice(0, 20)
  }

  // Generate events
  const event = maybeGenerateEvent(worldState, worldState.time.tick)
  if (event) {
    worldState.events.push(event)
    if (worldState.events.length > 50) worldState.events = worldState.events.slice(-50)
  }

  // Rotate hot topics
  worldState.hot_topics = maybeRotateHotTopics(worldState.time.tick, worldState.hot_topics)

  // Process message queue
  processMessages(worldState.bots, worldState.time.tick, moments)

  // Update world narrative
  const aliveBots = Object.values(worldState.bots).filter(b => b.status === 'alive')
  const activeLocations = new Set(aliveBots.map(b => b.location))
  worldState.world_narrative = `这是深圳的第${day}天，${hour}时。${aliveBots.length}个人分布在${activeLocations.size}个地点，各自忙碌着。天气${worldState.weather.current}。`
}

export function getWorldState(): WorldState {
  return worldState
}

export function getMoments(): Moment[] {
  return moments
}

export function queueMessage(from: string, to: string, message: string): void {
  queueMsg(from, to, message, worldState?.time.tick ?? 0)
}
