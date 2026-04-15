/**
 * Message handler — queue and process admin messages sent to bots.
 */

import type { BotState, Moment } from './seedData.js'

interface QueuedMessage {
  from: string
  message: string
  tick: number
}

const messageQueue = new Map<string, QueuedMessage[]>()

export function queueMessage(from: string, to: string, message: string, tick: number): void {
  if (!messageQueue.has(to)) messageQueue.set(to, [])
  messageQueue.get(to)!.push({ from, message, tick })
}

const RESPONSE_TEMPLATES = [
  '收到了，让我想想...',
  '嗯，我知道了',
  '谢谢关心！',
  '好的，我会注意的',
  '有道理，谢谢提醒',
  '感谢你的消息！',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function processMessages(
  bots: Record<string, BotState>,
  tick: number,
  moments: Moment[],
): void {
  for (const [botId, messages] of Array.from(messageQueue.entries())) {
    const bot = bots[botId]
    if (!bot || messages.length === 0) continue

    for (const msg of messages) {
      // Add to action log
      bot.action_log.push({
        tick,
        time: `2025-04-${String(Math.floor(tick / 24) + 1).padStart(2, '0')} ${String(tick % 24).padStart(2, '0')}:00`,
        plan: `收到来自${msg.from}的消息: "${msg.message}"`,
        result: { narrative: `${bot.name}${pick(RESPONSE_TEMPLATES)}` },
      })
      if (bot.action_log.length > 20) bot.action_log = bot.action_log.slice(-20)

      // Boost social emotion
      bot.emotions.happiness = Math.min(100, bot.emotions.happiness + 5)
      bot.emotions.loneliness = Math.max(0, bot.emotions.loneliness - 8)

      // Maybe post a moment in response (30% chance)
      if (Math.random() < 0.3) {
        const hour = tick % 24
        const day = Math.floor(tick / 24) + 1
        moments.push({
          id: `msg_moment_${tick}_${botId}`,
          bot_id: botId,
          bot_name: bot.name,
          content: `有人给我发消息了，说"${msg.message.slice(0, 20)}"，感觉有人关心真好`,
          tick,
          time: `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          likes: [],
          comments: [],
        })
      }
    }

    messageQueue.set(botId, [])
  }
}
