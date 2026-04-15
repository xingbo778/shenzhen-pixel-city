/**
 * Story Arc Tracker — identifies and tracks emergent narrative arcs from open loops.
 *
 * Arcs aren't pre-written plots. They're labels for clusters of open loops
 * that form a recognizable narrative pattern.
 */

import type { OpenLoop } from './openLoops.js'
import { getOpenLoops, getLoopsForBot } from './openLoops.js'
import type { BotState, WorldState } from './seedData.js'

export interface StoryArc {
  id: string
  title: string
  type: 'survival' | 'career' | 'romance' | 'rivalry' | 'redemption' | 'friendship'
  participants: string[]           // bot IDs
  phase: 'setup' | 'rising' | 'crisis' | 'climax' | 'aftermath'
  linked_loop_ids: string[]        // open loop IDs fueling this arc
  description: string
  started_tick: number
}

let arcs: StoryArc[] = []
let nextArcId = 1

export function getStoryArcs(): StoryArc[] {
  return arcs
}

export function getArcsForBot(botId: string): StoryArc[] {
  return arcs.filter(a => a.participants.includes(botId) && a.phase !== 'aftermath')
}

export function initArcs(): void {
  arcs = []
  nextArcId = 1
}

// ── Arc detection — infer arcs from open loop clusters ──────────

export function detectArcs(world: WorldState): void {
  const allLoops = getOpenLoops().filter(l => l.status !== 'resolved' && l.status !== 'exploded')
  const existingArcKeys = new Set(arcs.filter(a => a.phase !== 'aftermath').map(a => `${a.type}:${a.participants.sort().join(',')}`))

  for (const bot of Object.values(world.bots)) {
    if (bot.status !== 'alive') continue
    const botLoops = allLoops.filter(l => l.owner_bot_id === bot.id)

    // Survival arc: threat loops
    const threats = botLoops.filter(l => l.type === 'threat')
    if (threats.length >= 1) {
      const key = `survival:${bot.id}`
      if (!existingArcKeys.has(key)) {
        arcs.push({
          id: `arc_${nextArcId++}`,
          title: `${bot.name}的生存危机`,
          type: 'survival',
          participants: [bot.id],
          phase: threats.some(t => t.status === 'crisis') ? 'crisis' : 'rising',
          linked_loop_ids: threats.map(t => t.id),
          description: `${bot.name}面临经济困境`,
          started_tick: world.time.tick,
        })
        existingArcKeys.add(key)
      }
    }

    // Romance arc: crush loops
    const crushes = botLoops.filter(l => l.type === 'crush')
    for (const crush of crushes) {
      const participants = [bot.id, ...crush.related_bot_ids].sort()
      const key = `romance:${participants.join(',')}`
      if (!existingArcKeys.has(key)) {
        const targetName = crush.related_bot_ids.length > 0
          ? world.bots[crush.related_bot_ids[0]]?.name ?? '某人'
          : '某人'
        arcs.push({
          id: `arc_${nextArcId++}`,
          title: `${bot.name}和${targetName}的暧昧`,
          type: 'romance',
          participants,
          phase: 'setup',
          linked_loop_ids: [crush.id],
          description: `${bot.name}对${targetName}有微妙的感觉`,
          started_tick: world.time.tick,
        })
        existingArcKeys.add(key)
      }
    }

    // Rivalry arc: grudge loops
    const grudges = botLoops.filter(l => l.type === 'grudge')
    for (const grudge of grudges) {
      const participants = [bot.id, ...grudge.related_bot_ids].sort()
      const key = `rivalry:${participants.join(',')}`
      if (!existingArcKeys.has(key)) {
        arcs.push({
          id: `arc_${nextArcId++}`,
          title: `${bot.name}与人的冲突`,
          type: 'rivalry',
          participants,
          phase: 'setup',
          linked_loop_ids: [grudge.id],
          description: grudge.description,
          started_tick: world.time.tick,
        })
        existingArcKeys.add(key)
      }
    }
  }
}

// ── Arc progression ─────────────────────────────────────────────

export function tickArcs(world: WorldState): void {
  const allLoops = getOpenLoops()

  for (const arc of arcs) {
    if (arc.phase === 'aftermath') continue

    // Check linked loops status
    const linkedLoops = allLoops.filter(l => arc.linked_loop_ids.includes(l.id))
    const allResolved = linkedLoops.every(l => l.status === 'resolved' || l.status === 'exploded')
    const anyCrisis = linkedLoops.some(l => l.status === 'crisis')
    const anyExploded = linkedLoops.some(l => l.status === 'exploded')
    const maxWeight = Math.max(0, ...linkedLoops.map(l => l.emotional_weight))

    // Phase transitions
    if (allResolved || anyExploded) {
      arc.phase = 'aftermath'
      const outcome = anyExploded ? '以戏剧性的方式结束了' : '暂时告一段落'
      arc.description = `${arc.title} — ${outcome}`
      console.log(`[arcs] ${arc.title} → aftermath`)
    } else if (anyCrisis || maxWeight > 85) {
      if (arc.phase !== 'climax') {
        arc.phase = 'climax'
        arc.description = `${arc.title}正在走向高潮`
        console.log(`[arcs] ${arc.title} → climax`)
      }
    } else if (maxWeight > 60) {
      if (arc.phase === 'setup' || arc.phase === 'rising') {
        arc.phase = 'crisis'
        arc.description = `${arc.title}进入危机阶段`
      }
    } else if (maxWeight > 30) {
      if (arc.phase === 'setup') {
        arc.phase = 'rising'
      }
    }

    // Update linked loops (may have new loops added since arc creation)
    const botLoops = getLoopsForBot(arc.participants[0])
    for (const loop of botLoops) {
      if (!arc.linked_loop_ids.includes(loop.id)) {
        // Check if this loop is relevant to the arc type
        if ((arc.type === 'survival' && loop.type === 'threat') ||
            (arc.type === 'survival' && loop.type === 'debt') ||
            (arc.type === 'romance' && loop.type === 'crush') ||
            (arc.type === 'rivalry' && loop.type === 'grudge')) {
          arc.linked_loop_ids.push(loop.id)
        }
      }
    }
  }
}

/**
 * Get bot IDs that are in climax/crisis arcs (should get priority AI decisions).
 */
export function getArcPriorityBotIds(): string[] {
  const ids = new Set<string>()
  for (const arc of arcs) {
    if (arc.phase === 'climax' || arc.phase === 'crisis') {
      for (const p of arc.participants) ids.add(p)
    }
  }
  return Array.from(ids)
}

/**
 * Get arc summary for AI prompt.
 */
export function getArcSummaryForPrompt(botId: string): string {
  const botArcs = getArcsForBot(botId)
  if (botArcs.length === 0) return ''

  const phaseLabels: Record<string, string> = {
    setup: '开端', rising: '发展', crisis: '危机', climax: '高潮', aftermath: '尾声',
  }

  const lines = botArcs.map(arc => {
    const phase = phaseLabels[arc.phase] ?? arc.phase
    return `- [${arc.title}] ${arc.description} (阶段: ${phase})`
  })

  return `📖 你的故事线：\n${lines.join('\n')}`
}

/**
 * Generate world narrative from active arcs.
 */
export function generateArcNarrative(world: WorldState): string {
  const activeArcs = arcs.filter(a => a.phase !== 'aftermath' && a.phase !== 'setup')

  if (activeArcs.length === 0) {
    const day = world.time.virtual_day
    const hour = world.time.virtual_hour
    const botCount = Object.values(world.bots).filter(b => b.status === 'alive').length
    return `这是深圳的第${day}天，${hour}时。${botCount}个人在这座城市里各自忙碌着。平静的表面下，故事正在悄悄酝酿。`
  }

  const arcDescs = activeArcs
    .sort((a, b) => {
      const phaseOrder: Record<string, number> = { climax: 0, crisis: 1, rising: 2, setup: 3, aftermath: 4 }
      return (phaseOrder[a.phase] ?? 5) - (phaseOrder[b.phase] ?? 5)
    })
    .slice(0, 3)
    .map(arc => arc.description)

  const day = world.time.virtual_day
  return `这是深圳的第${day}天。${arcDescs.join('。')}。`
}

/**
 * Export flat arc data for WorldState.
 */
export function getArcsFlat(): { id: string; title: string; type: string; participants: string[]; phase: string; description: string }[] {
  return arcs
    .filter(a => a.phase !== 'aftermath')
    .map(a => ({
      id: a.id, title: a.title, type: a.type,
      participants: a.participants, phase: a.phase, description: a.description,
    }))
}
