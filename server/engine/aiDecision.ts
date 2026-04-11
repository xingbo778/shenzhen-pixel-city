/**
 * AI Decision — uses Claude Code CLI to drive bot behavior.
 *
 * Each tick, 1-2 bots get an AI-driven decision via `claude -p`.
 * Other bots fall back to rule-based logic.
 * If the CLI call fails or times out, the bot also falls back.
 */

import { execSync } from 'node:child_process'
import type { BotState, WorldState, Moment } from './seedData.js'
import { LOCATION_NAMES } from './seedData.js'

export interface BotDecision {
  move_to?: string       // location name, or null to stay
  activity: string       // what the bot is doing
  emotion_deltas?: {     // changes to emotions (-10 to +10)
    happiness?: number
    sadness?: number
    anger?: number
    anxiety?: number
    loneliness?: number
  }
  moment_content?: string // if set, bot posts a moment
  narrative?: string      // action log narrative
}

// Round-robin index for which bot gets AI this tick
let aiRobinIndex = 0

/**
 * Get which bot IDs should receive AI decisions this tick.
 * Returns 1-2 bot IDs per tick, rotating through all bots.
 */
export function getAIBotIds(botIds: string[], botsPerTick = 2): string[] {
  if (botIds.length === 0) return []
  const result: string[] = []
  for (let i = 0; i < Math.min(botsPerTick, botIds.length); i++) {
    result.push(botIds[(aiRobinIndex + i) % botIds.length])
  }
  aiRobinIndex = (aiRobinIndex + botsPerTick) % botIds.length
  return result
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function buildPrompt(bot: BotState, world: WorldState): string {
  const hour = world.time.virtual_hour
  const locations = LOCATION_NAMES.join('、')
  const otherBots = Object.values(world.bots)
    .filter(b => b.id !== bot.id && b.status === 'alive')
    .map(b => `${b.name}(${b.occupation ?? b.job ?? '无业'})在${b.location}`)
    .join('；')

  const recentLogs = bot.action_log.slice(-3).map(l => l.plan).join('；')

  return `你是深圳城市模拟中的角色"${bot.name}"。

基本信息：${bot.age}岁${bot.gender}，${bot.origin}人，${bot.edu}学历，职业${bot.job ?? '无业'}
当前状态：在${bot.location}，体力${Math.round(bot.energy)}，饱腹${Math.round(bot.satiety)}，金钱¥${bot.money}
情绪：开心${Math.round(bot.emotions.happiness)} 焦虑${Math.round(bot.emotions.anxiety)} 孤独${Math.round(bot.emotions.loneliness)} 悲伤${Math.round(bot.emotions.sadness)} 愤怒${Math.round(bot.emotions.anger)}
人生目标：${bot.long_term_goal ?? '无'}
最近做了：${recentLogs || '刚开始新的一天'}

现在是第${world.time.virtual_day}天${hour}时，天气${world.weather.current}。
可选地点：${locations}
其他人：${otherBots}

请决定${bot.name}接下来要做什么。返回纯JSON（不要markdown）：
{"move_to":"地点名或null","activity":"一句话描述正在做什么","emotion_deltas":{"happiness":0,"sadness":0,"anger":0,"anxiety":0,"loneliness":0},"moment_content":"朋友圈内容或null","narrative":"叙事描述"}`
}

/**
 * Call Claude Code CLI for a bot decision.
 * Returns null on failure (caller should fall back to rules).
 */
export function getAIDecision(bot: BotState, world: WorldState): BotDecision | null {
  const prompt = buildPrompt(bot, world)

  try {
    const result = execSync(
      'claude -p --output-format json --model haiku --no-session-persistence --max-turns 1',
      {
        input: prompt,
        timeout: 60000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    // claude --output-format json returns {"result": "...", "is_error": bool, ...}
    let parsed: any
    try {
      const outer = JSON.parse(result.trim())
      if (outer.is_error) return null
      const text = outer.result ?? ''
      // The result text should contain our JSON. Extract it (may have markdown fences).
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Try extracting JSON from raw output
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      parsed = JSON.parse(jsonMatch[0])
    }

    // Validate and sanitize
    const decision: BotDecision = {
      activity: typeof parsed.activity === 'string' ? parsed.activity.slice(0, 80) : '闲逛',
    }

    if (parsed.move_to && typeof parsed.move_to === 'string' && LOCATION_NAMES.includes(parsed.move_to as any)) {
      decision.move_to = parsed.move_to
    }

    if (parsed.emotion_deltas && typeof parsed.emotion_deltas === 'object') {
      decision.emotion_deltas = {}
      for (const key of ['happiness', 'sadness', 'anger', 'anxiety', 'loneliness'] as const) {
        const v = parsed.emotion_deltas[key]
        if (typeof v === 'number') {
          decision.emotion_deltas[key] = clamp(v, -10, 10)
        }
      }
    }

    if (parsed.moment_content && typeof parsed.moment_content === 'string' && parsed.moment_content !== 'null') {
      decision.moment_content = parsed.moment_content.slice(0, 200)
    }

    if (parsed.narrative && typeof parsed.narrative === 'string') {
      decision.narrative = parsed.narrative.slice(0, 200)
    }

    return decision
  } catch (err: any) {
    if (err.status === null) {
      console.warn(`[ai] Timeout for ${bot.name}, falling back to rules`)
    } else {
      console.warn(`[ai] CLI error for ${bot.name}: ${err.message?.slice(0, 100)}`)
    }
    return null
  }
}

/**
 * Apply an AI decision to a bot state. Called from simulation.ts.
 */
export function applyDecision(
  bot: BotState,
  decision: BotDecision,
  tick: number,
  moments: Moment[],
  allBots: Record<string, BotState>,
): void {
  // Move
  if (decision.move_to) {
    bot.location = decision.move_to
  }

  // Activity
  bot.current_activity = decision.activity

  // Emotion deltas
  if (decision.emotion_deltas) {
    for (const [key, delta] of Object.entries(decision.emotion_deltas)) {
      const k = key as keyof typeof bot.emotions
      if (k in bot.emotions && typeof delta === 'number') {
        bot.emotions[k] = clamp(bot.emotions[k] + delta, 0, 100)
      }
    }
  }

  // Action log
  bot.action_log.push({
    tick,
    time: `2025-04-${String(Math.floor(tick / 24) + 1).padStart(2, '0')} ${String(tick % 24).padStart(2, '0')}:00`,
    plan: decision.activity,
    result: { narrative: decision.narrative ?? `${bot.name}${decision.activity}` },
  })
  if (bot.action_log.length > 20) bot.action_log = bot.action_log.slice(-20)

  // Energy/satiety still decays
  bot.energy = clamp(bot.energy - (2 + Math.random() * 2), 0, 100)
  bot.satiety = clamp(bot.satiety - (1 + Math.random() * 2), 0, 100)
  bot.phone_battery = clamp(bot.phone_battery - (1 + Math.random()), 0, 100)

  // Moment
  if (decision.moment_content) {
    const hour = tick % 24
    const day = Math.floor(tick / 24) + 1
    const otherIds = Object.keys(allBots).filter(id => id !== bot.id)
    const likeCount = Math.floor(Math.random() * 4)
    const likes = otherIds.sort(() => Math.random() - 0.5).slice(0, likeCount)
    moments.push({
      id: `ai_moment_${tick}_${bot.id}`,
      bot_id: bot.id,
      bot_name: bot.name,
      content: decision.moment_content,
      tick,
      time: `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      likes,
      comments: [],
    })
  }
}
