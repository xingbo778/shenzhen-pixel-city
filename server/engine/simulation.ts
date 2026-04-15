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
import { initLoops, tickLoops, detectNewLoops, getOpenLoops, getCrisisLoopBotIds } from './openLoops.js'
import { initRelationships, tickRelationships, getRelationshipsFlat } from './relationships.js'
import { initArcs, detectArcs, tickArcs, getArcPriorityBotIds, generateArcNarrative, getArcsFlat } from './storyArcs.js'

const USE_AI = process.env.USE_AI === 'true'
const AI_BOTS_PER_TICK = parseInt(process.env.AI_BOTS_PER_TICK || '1', 10)

let worldState: WorldState
let moments: Moment[]

export function initWorld(): void {
  worldState = createInitialWorldState()
  moments = createInitialMoments()
  initLoops()
  initRelationships(worldState.bots)
  initArcs()
  console.log(`[engine] World initialized with ${Object.keys(worldState.bots).length} bots, ${Object.keys(worldState.locations).length} locations`)
  console.log(`[engine] AI mode: ${USE_AI ? `ON (${AI_BOTS_PER_TICK} bots/tick via Claude CLI)` : 'OFF (rule-based)'}`)
  console.log(`[engine] Narrative systems: open loops + relationships + story arcs`)
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

  // Priority: bots in crisis loops or climax arcs always get AI
  const crisisBotIds = getCrisisLoopBotIds()
  const arcPriorityBotIds = getArcPriorityBotIds()
  const priorityBotIds = new Set(crisisBotIds.concat(arcPriorityBotIds))

  // Regular round-robin for non-priority bots
  const regularAI = USE_AI ? getAIBotIds(aliveBotIds.filter(id => !priorityBotIds.has(id)), AI_BOTS_PER_TICK) : []
  const allAI = Array.from(priorityBotIds).concat(regularAI)
  const aiBotIds = USE_AI ? new Set(allAI) : new Set<string>()

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

  // ── Narrative systems ─────────────────────────────────────────
  tickRelationships(worldState.bots, worldState.time.tick)
  detectNewLoops(worldState)
  tickLoops(worldState)
  detectArcs(worldState)
  tickArcs(worldState)

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

  // Update world narrative from story arcs
  worldState.world_narrative = generateArcNarrative(worldState)
}

export function getWorldState(): WorldState & { open_loops?: any[]; relationships?: any[]; story_arcs?: any[] } {
  return {
    ...worldState,
    open_loops: getOpenLoops().filter(l => l.status !== 'resolved' && l.status !== 'exploded').map(l => ({
      id: l.id, title: l.title, type: l.type, owner_bot_id: l.owner_bot_id,
      related_bot_ids: l.related_bot_ids, emotional_weight: Math.round(l.emotional_weight),
      urgency: Math.round(l.urgency), status: l.status, description: l.description,
    })),
    relationships: getRelationshipsFlat(),
    story_arcs: getArcsFlat(),
  }
}

export function getMoments(): Moment[] {
  return moments
}

export function queueMessage(from: string, to: string, message: string): void {
  queueMsg(from, to, message, worldState?.time.tick ?? 0)
}
