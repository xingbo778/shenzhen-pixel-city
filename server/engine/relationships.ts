/**
 * Relationship Graph — tracks affinity, trust, debt, and awkwardness between bots.
 *
 * Key insight: relationships aren't just "like/dislike" — they carry debt and awkwardness
 * that create open loops and narrative tension.
 */

import type { BotState } from './seedData.js'

export interface Relationship {
  affinity: number        // -100 ~ +100
  trust: number           // 0 ~ 100
  debt: number            // positive = they owe me, negative = I owe them
  status: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'rival' | 'crush'
  awkwardness: number     // 0-100
  history: string[]       // last 5 interaction summaries
  last_tick: number
}

// graph[fromBotId][toBotId] = Relationship
const graph = new Map<string, Map<string, Relationship>>()

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function initRelationships(bots: Record<string, BotState>): void {
  graph.clear()
  const ids = Object.keys(bots)

  // Initialize all pairs as strangers
  for (const a of ids) {
    graph.set(a, new Map())
    for (const b of ids) {
      if (a === b) continue
      graph.get(a)!.set(b, {
        affinity: 0, trust: 10, debt: 0,
        status: 'stranger', awkwardness: 30,
        history: [], last_tick: 0,
      })
    }
  }

  // Set initial relationships based on backstory
  setInitial('bot_1', 'bot_8', { affinity: 25, trust: 40, status: 'acquaintance', awkwardness: 10, history: ['同在南山科技园工作'] })
  setInitial('bot_1', 'bot_4', { affinity: 20, trust: 30, status: 'acquaintance', awkwardness: 15, history: ['同公司不同部门'] })
  setInitial('bot_8', 'bot_4', { affinity: 30, trust: 35, status: 'acquaintance', awkwardness: 10, history: ['经常一起吃午饭'] })
  setInitial('bot_3', 'bot_7', { affinity: 30, trust: 35, status: 'acquaintance', awkwardness: 5, history: ['同住宝安城中村，经常聊天'] })
  setInitial('bot_3', 'bot_6', { affinity: 15, trust: 20, status: 'acquaintance', awkwardness: 20, history: ['城中村邻居'] })
  setInitial('bot_6', 'bot_7', { affinity: 20, trust: 25, status: 'acquaintance', awkwardness: 15, history: ['都住城中村'] })
  setInitial('bot_2', 'bot_5', { affinity: 20, trust: 25, status: 'acquaintance', awkwardness: 20, history: ['在福田CBD认识'] })
}

function setInitial(a: string, b: string, partial: Partial<Relationship>): void {
  const relAB = graph.get(a)?.get(b)
  const relBA = graph.get(b)?.get(a)
  if (relAB) Object.assign(relAB, partial)
  if (relBA) Object.assign(relBA, partial)
}

export function getRelationship(from: string, to: string): Relationship | null {
  return graph.get(from)?.get(to) ?? null
}

export function getAllRelationships(): Map<string, Map<string, Relationship>> {
  return graph
}

// ── Tick update ─────────────────────────────────────────────────

export function tickRelationships(bots: Record<string, BotState>, tick: number): void {
  const aliveBots = Object.values(bots).filter(b => b.status === 'alive')

  // Group by location
  const byLocation = new Map<string, BotState[]>()
  for (const bot of aliveBots) {
    if (!byLocation.has(bot.location)) byLocation.set(bot.location, [])
    byLocation.get(bot.location)!.push(bot)
  }

  // Co-location: affinity grows, awkwardness shrinks
  for (const [, botsInLoc] of Array.from(byLocation.entries())) {
    for (let i = 0; i < botsInLoc.length; i++) {
      for (let j = i + 1; j < botsInLoc.length; j++) {
        const a = botsInLoc[i].id
        const b = botsInLoc[j].id
        updatePair(a, b, tick, { affinity: 0.5, trust: 0.3, awkwardness: -0.3 })
      }
    }
  }

  // Distance decay: bots apart for a long time lose affinity slightly
  for (const [fromId, rels] of Array.from(graph.entries())) {
    for (const [toId, rel] of Array.from(rels.entries())) {
      if (tick - rel.last_tick > 20 && rel.affinity > -50) {
        rel.affinity = clamp(rel.affinity - 0.2, -100, 100)
      }
    }
  }

  // Update statuses
  for (const [, rels] of Array.from(graph.entries())) {
    for (const [, rel] of Array.from(rels.entries())) {
      if (rel.affinity > 70 && rel.trust > 60) rel.status = 'close_friend'
      else if (rel.affinity > 40) rel.status = 'friend'
      else if (rel.affinity > 10) rel.status = 'acquaintance'
      else if (rel.affinity < -30) rel.status = 'rival'
      else if (rel.affinity <= 0 && rel.trust < 15) rel.status = 'stranger'
    }
  }
}

function updatePair(a: string, b: string, tick: number, deltas: { affinity: number; trust: number; awkwardness: number }): void {
  for (const [from, to] of [[a, b], [b, a]]) {
    const rel = graph.get(from)?.get(to)
    if (!rel) continue
    rel.affinity = clamp(rel.affinity + deltas.affinity, -100, 100)
    rel.trust = clamp(rel.trust + deltas.trust, 0, 100)
    rel.awkwardness = clamp(rel.awkwardness + deltas.awkwardness, 0, 100)
    rel.last_tick = tick
  }
}

/**
 * Record an interaction between two bots.
 */
export function recordInteraction(
  from: string, to: string, tick: number,
  summary: string,
  deltas: { affinity?: number; trust?: number; debt?: number; awkwardness?: number },
): void {
  for (const [a, b] of [[from, to], [to, from]]) {
    const rel = graph.get(a)?.get(b)
    if (!rel) continue
    if (deltas.affinity) rel.affinity = clamp(rel.affinity + deltas.affinity, -100, 100)
    if (deltas.trust) rel.trust = clamp(rel.trust + deltas.trust, 0, 100)
    if (deltas.awkwardness) rel.awkwardness = clamp(rel.awkwardness + deltas.awkwardness, 0, 100)
    if (deltas.debt) rel.debt += (a === from ? deltas.debt : -deltas.debt)
    rel.history.push(summary)
    if (rel.history.length > 5) rel.history = rel.history.slice(-5)
    rel.last_tick = tick
  }
}

/**
 * Get relationship summary for AI prompt.
 */
export function getRelationshipSummaryForPrompt(botId: string, bots: Record<string, BotState>): string {
  const rels = graph.get(botId)
  if (!rels) return ''

  const entries = Array.from(rels.entries())
    .filter(([, rel]) => rel.status !== 'stranger' || rel.affinity !== 0)
    .sort((a, b) => Math.abs(b[1].affinity) - Math.abs(a[1].affinity))
    .slice(0, 6)

  if (entries.length === 0) return ''

  const lines = entries.map(([targetId, rel]) => {
    const target = bots[targetId]
    if (!target) return ''
    const name = target.name
    const job = target.occupation ?? target.job ?? '无业'
    const statusLabel = rel.status === 'close_friend' ? '密友' : rel.status === 'friend' ? '朋友' :
      rel.status === 'rival' ? '对头' : rel.status === 'crush' ? '心动' :
      rel.status === 'acquaintance' ? '认识' : '陌生人'
    const debtNote = rel.debt > 0 ? `，对方欠你¥${rel.debt}` : rel.debt < 0 ? `，你欠对方¥${Math.abs(rel.debt)}` : ''
    const awkNote = rel.awkwardness > 40 ? ` [尴尬度:${Math.round(rel.awkwardness)}]` : ''
    const lastHistory = rel.history.length > 0 ? `，${rel.history[rel.history.length - 1]}` : ''
    return `- ${name}(${job}/${statusLabel}): 好感${Math.round(rel.affinity)}/信任${Math.round(rel.trust)}${debtNote}${awkNote}${lastHistory}`
  }).filter(Boolean)

  return lines.length > 0 ? `👥 你认识的人：\n${lines.join('\n')}` : ''
}

/**
 * Export flat relationship data for WorldState.
 */
export function getRelationshipsFlat(): { from: string; to: string; affinity: number; trust: number; status: string }[] {
  const edges: { from: string; to: string; affinity: number; trust: number; status: string }[] = []
  for (const [from, rels] of Array.from(graph.entries())) {
    for (const [to, rel] of Array.from(rels.entries())) {
      if (from < to) {
        edges.push({ from, to, affinity: Math.round(rel.affinity), trust: Math.round(rel.trust), status: rel.status })
      }
    }
  }
  return edges
}
