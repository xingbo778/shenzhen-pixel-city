/**
 * Open Loops — unresolved tensions that rot, intensify, and mutate over time.
 *
 * Design principle (from wiki): "Tension should not be a data point. It should age,
 * change meaning, and shape later choices."
 *
 * An open loop is something that won't resolve itself — it gets worse when ignored.
 */

import type { BotState, WorldState } from './seedData.js'

export interface OpenLoop {
  id: string
  title: string
  type: 'debt' | 'promise' | 'grudge' | 'crush' | 'opportunity' | 'threat' | 'shame' | 'secret'
  owner_bot_id: string
  related_bot_ids: string[]
  emotional_weight: number      // 0-100+, grows over time
  urgency: number               // 0-100
  avoidance: number             // 0-100, how much the bot doesn't want to deal with this
  age: number                   // ticks since creation
  status: 'active' | 'festering' | 'crisis' | 'resolved' | 'exploded'
  description: string
  origin_event: string
  possible_actions: string[]
  decay_rate: number            // how fast weight grows per tick
}

let nextLoopId = 1
let loops: OpenLoop[] = []

export function getOpenLoops(): OpenLoop[] {
  return loops
}

export function getLoopsForBot(botId: string): OpenLoop[] {
  return loops.filter(l =>
    l.status !== 'resolved' && l.status !== 'exploded' &&
    (l.owner_bot_id === botId || l.related_bot_ids.includes(botId))
  )
}

export function getCrisisLoopBotIds(): string[] {
  const ids = new Set<string>()
  for (const loop of loops) {
    if (loop.status === 'crisis' || loop.status === 'festering') {
      ids.add(loop.owner_bot_id)
    }
  }
  return Array.from(ids)
}

export function initLoops(): void {
  loops = []
  nextLoopId = 1
}

// ── Tension decay / rot ────────────────────────────────────────

export function tickLoops(world: WorldState): void {
  for (const loop of loops) {
    if (loop.status === 'resolved' || loop.status === 'exploded') continue

    loop.age++

    // Weight grows — faster if the bot is avoiding it
    const avoidanceMultiplier = loop.avoidance > 50 ? 1.5 : 1.0
    loop.emotional_weight += loop.decay_rate * avoidanceMultiplier

    // Status transitions
    if (loop.emotional_weight > 90 && loop.status !== 'crisis') {
      loop.status = 'crisis'
      loop.description = `[危机] ${loop.title} — 已经拖到不能再拖了`
      console.log(`[loops] CRISIS: ${loop.title} (owner: ${loop.owner_bot_id})`)
    } else if (loop.emotional_weight > 70 && loop.status === 'active') {
      loop.status = 'festering'
      loop.description = `${loop.title} — 越拖越严重`
    }

    // Explosion — irreversible consequence
    if (loop.emotional_weight > 110) {
      loop.status = 'exploded'
      applyExplosion(loop, world)
      console.log(`[loops] EXPLODED: ${loop.title} (owner: ${loop.owner_bot_id})`)
    }
  }

  // Clean up old resolved/exploded loops (keep last 20 for history)
  const dead = loops.filter(l => l.status === 'resolved' || l.status === 'exploded')
  if (dead.length > 20) {
    const toRemove = new Set(dead.slice(0, dead.length - 20).map(l => l.id))
    loops = loops.filter(l => !toRemove.has(l.id))
  }
}

function applyExplosion(loop: OpenLoop, world: WorldState): void {
  const bot = world.bots[loop.owner_bot_id]
  if (!bot) return

  switch (loop.type) {
    case 'threat':
      // Financial crisis: lose money, hp hit
      if (bot.money > 0) bot.money = Math.max(0, bot.money - 500)
      bot.hp = Math.max(10, bot.hp - 15)
      bot.emotions.anxiety = Math.min(100, bot.emotions.anxiety + 25)
      bot.emotions.sadness = Math.min(100, bot.emotions.sadness + 20)
      break
    case 'debt':
      // Relationship damage with creditor
      bot.emotions.anxiety = Math.min(100, bot.emotions.anxiety + 20)
      bot.emotions.sadness = Math.min(100, bot.emotions.sadness + 10)
      break
    case 'promise':
      // Trust damage with the person promised to
      bot.emotions.sadness = Math.min(100, bot.emotions.sadness + 15)
      break
    case 'grudge':
      // Conflict erupts
      bot.emotions.anger = Math.min(100, bot.emotions.anger + 30)
      break
    case 'crush':
      // Awkward reveal
      bot.emotions.anxiety = Math.min(100, bot.emotions.anxiety + 25)
      break
    default:
      bot.emotions.anxiety = Math.min(100, bot.emotions.anxiety + 15)
  }
}

// ── Loop generation from bot contradictions ─────────────────────

export function detectNewLoops(world: WorldState): void {
  const tick = world.time.tick
  const existingKeys = new Set(loops.filter(l => l.status !== 'resolved' && l.status !== 'exploded').map(l => `${l.owner_bot_id}:${l.type}`))

  for (const bot of Object.values(world.bots)) {
    if (bot.status !== 'alive') continue

    // Financial threat (only one threat loop per bot)
    if (bot.money < 500 && bot.job !== null && !existingKeys.has(`${bot.id}:threat`)) {
      addLoop({
        title: '工资不够花，下个月房租怎么办',
        type: 'threat',
        owner_bot_id: bot.id,
        related_bot_ids: [],
        emotional_weight: 30,
        urgency: 60,
        avoidance: 40,
        description: `${bot.name}的存款只剩¥${bot.money}，但还要交房租`,
        origin_event: '存款不足',
        possible_actions: ['找兼职', '借钱', '省吃俭用', '跟房东商量晚交'],
        decay_rate: 1.5,
      })
    }

    // Broke and jobless
    if (bot.money < 200 && bot.job === null && !existingKeys.has(`${bot.id}:threat`)) {
      addLoop({
        title: '身上快没钱了',
        type: 'threat',
        owner_bot_id: bot.id,
        related_bot_ids: [],
        emotional_weight: 60,
        urgency: 90,
        avoidance: 30,
        description: `${bot.name}失业了，存款只剩¥${bot.money}`,
        origin_event: '失业+存款见底',
        possible_actions: ['接受任何工作', '找朋友借钱', '回老家', '在街上流浪'],
        decay_rate: 3.0,
      })
    }

    // Loneliness building up
    if (bot.emotions.loneliness > 65 && !existingKeys.has(`${bot.id}:crush`)) {
      const otherBots = Object.values(world.bots).filter(b =>
        b.id !== bot.id && b.status === 'alive' && b.location === bot.location
      )
      if (otherBots.length > 0) {
        const target = otherBots[Math.floor(Math.random() * otherBots.length)]
        addLoop({
          title: `和${target.name}越来越熟了，但不确定该不该...`,
          type: 'crush',
          owner_bot_id: bot.id,
          related_bot_ids: [target.id],
          emotional_weight: 20,
          urgency: 15,
          avoidance: 60,
          description: `${bot.name}经常遇到${target.name}，内心有些悸动`,
          origin_event: `在${bot.location}频繁偶遇`,
          possible_actions: ['主动搭话', '假装没看到', '找借口接近', '跟朋友聊聊这件事'],
          decay_rate: 0.5,
        })
      }
    }

    // Health crisis
    if (bot.energy < 20 && bot.hp < 50 && !existingKeys.has(`${bot.id}:threat`)) {
      addLoop({
        title: '身体快撑不住了',
        type: 'threat',
        owner_bot_id: bot.id,
        related_bot_ids: [],
        emotional_weight: 50,
        urgency: 80,
        avoidance: 20,
        description: `${bot.name}体力透支，身体在发出警告`,
        origin_event: '过度劳累',
        possible_actions: ['去医院检查', '请假休息', '硬撑着继续', '回家躺着'],
        decay_rate: 2.5,
      })
    }

    // Shame from low reputation
    if (bot.reputation.score < 0 && !existingKeys.has(`${bot.id}:shame`)) {
      addLoop({
        title: '名声受损，别人怎么看我',
        type: 'shame',
        owner_bot_id: bot.id,
        related_bot_ids: [],
        emotional_weight: 35,
        urgency: 25,
        avoidance: 70,
        description: `${bot.name}觉得别人在背后议论自己`,
        origin_event: '声誉下降',
        possible_actions: ['努力证明自己', '假装不在乎', '换个地方重新开始', '找人倾诉'],
        decay_rate: 0.8,
      })
    }
  }

  // Cross-bot tensions: bots in same location with negative affinity
  // (will be populated once relationships system is integrated)
}

function addLoop(partial: Omit<OpenLoop, 'id' | 'age' | 'status'>): void {
  loops.push({
    ...partial,
    id: `loop_${nextLoopId++}`,
    age: 0,
    status: partial.emotional_weight >= 90 ? 'crisis' : partial.emotional_weight >= 70 ? 'festering' : 'active',
  })
}

/**
 * Mark a loop as resolved (called when AI decides to address it).
 */
export function resolveLoop(loopId: string): void {
  const loop = loops.find(l => l.id === loopId)
  if (loop) loop.status = 'resolved'
}

/**
 * Get a formatted summary for the AI prompt.
 */
export function getLoopsSummaryForPrompt(botId: string): string {
  const botLoops = getLoopsForBot(botId)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 5)

  if (botLoops.length === 0) return ''

  const icons: Record<string, string> = {
    threat: '💰', debt: '🤝', promise: '📝', grudge: '😤',
    crush: '💗', opportunity: '✨', shame: '😔', secret: '🤫',
  }

  const lines = botLoops.map(loop => {
    const icon = icons[loop.type] ?? '❓'
    const statusTag = loop.status === 'crisis' ? '[危机]' : loop.status === 'festering' ? '[恶化中]' : ''
    const avoidNote = loop.avoidance > 50 ? '，你一直在回避这件事' : ''
    return `${icon} ${statusTag} ${loop.description} (紧迫度:${Math.round(loop.urgency)}/100, 情感重量:${Math.round(loop.emotional_weight)}/100${avoidNote})\n   可选: ${loop.possible_actions.join(' / ')}`
  })

  return `⚡ 你面对的事情（按紧迫排序）：\n${lines.join('\n')}`
}
