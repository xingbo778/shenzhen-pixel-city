/**
 * Bot behavior system — deterministic rule-based bot decision-making.
 * Each tick: movement, activity, emotions, energy, money, sleep cycle.
 */

import type { BotState, WorldState } from './seedData.js'
import { LOCATION_NAMES } from './seedData.js'
import { isOutdoorUnfriendly } from './weatherSystem.js'

// ── Activity pools per location type ──────────────────────────────

const ACTIVITIES: Record<string, string[]> = {
  '南山科技园': ['在工位敲代码', '和同事开会讨论需求', '在茶水间摸鱼刷手机', '调试Bug中', '在食堂吃午饭', '和同事聊技术八卦'],
  '福田CBD': ['在办公室写PPT', '和客户开视频会议', '在咖啡厅见投资人', '整理财务报表', '午休中', '在楼下便利店买咖啡'],
  '华强北': ['在各档口比价进货', '和客户谈价格', '清点库存', '在档口等客人上门', '去隔壁吃快餐', '刷手机看行情'],
  '东门老街': ['在市场采购食材', '炒菜做饭', '招呼客人', '打扫店铺卫生', '在门口吃早餐', '和老街坊聊天'],
  '宝安城中村': ['在村口和老乡聊天', '在出租屋里刷短视频', '去楼下小卖部买东西', '找工头问有没有活儿', '在家做饭', '和邻居下棋'],
  '南山公寓': ['在家看电视', '做饭吃晚餐', '洗漱准备睡觉', '在客厅玩手机', '整理房间', '和室友聊天'],
  '深圳湾公园': ['在海边散步', '跑步锻炼', '拍照发朋友圈', '坐在长椅上发呆', '和朋友一起野餐', '看海景放松心情'],
}

const SLEEP_ACTIVITIES = ['在床上睡觉', '睡得很香', '做了个美梦', '翻来覆去睡不着']

// ── Work location mapping ──────────────────────────────────────

const WORK_LOCATIONS: Record<string, string> = {
  bot_1: '南山科技园', bot_2: '福田CBD', bot_3: '宝安城中村',
  bot_4: '南山科技园', bot_5: '福田CBD', bot_6: '华强北',
  bot_7: '东门老街', bot_8: '南山科技园',
}

// ── Helpers ─────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function drift(value: number, range: number, min = 0, max = 100): number {
  return clamp(value + (Math.random() - 0.5) * 2 * range, min, max)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatTime(tick: number): string {
  const hour = tick % 24
  const day = Math.floor(tick / 24) + 1
  return `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`
}

// ── Core update ─────────────────────────────────────────────────

export function updateBot(bot: BotState, world: WorldState, tick: number): BotState {
  const hour = world.time.virtual_hour
  const isNight = hour >= 22 || hour < 6
  const isRaining = isOutdoorUnfriendly(world.weather.current)

  // ── Sleep cycle ──
  if (bot.is_sleeping) {
    bot.energy = clamp(bot.energy + 8, 0, 100)
    bot.satiety = clamp(bot.satiety - 1, 0, 100)
    bot.current_activity = pick(SLEEP_ACTIVITIES)
    if (bot.energy >= 75 && hour >= 6 && hour < 10) {
      bot.is_sleeping = false
      bot.current_activity = '刚睡醒，准备新的一天'
    }
    return bot
  }

  // Should go to sleep?
  if (isNight && bot.energy < 35) {
    if (bot.location !== bot.home) {
      bot.location = bot.home
    }
    bot.is_sleeping = true
    bot.current_activity = '太累了，准备睡觉'
    return bot
  }

  // ── Movement ──
  const moveChance = isNight ? 0.05 : 0.15
  if (Math.random() < moveChance) {
    let destination: string

    if (hour >= 8 && hour < 18 && !isNight) {
      // Daytime: go to work or commercial area
      const workLoc = WORK_LOCATIONS[bot.id]
      if (workLoc && bot.location !== workLoc && Math.random() < 0.6) {
        destination = workLoc
      } else if (bot.energy < 30) {
        destination = bot.home
      } else if (Math.random() < 0.2 && !isRaining) {
        destination = '深圳湾公园'
      } else {
        destination = pick(LOCATION_NAMES.filter(l => l !== bot.location) as string[])
      }
    } else if (hour >= 18 && hour < 22) {
      // Evening: go home, eat, or leisure
      if (bot.satiety < 40) {
        destination = pick(['东门老街', '华强北', '宝安城中村'])
      } else if (Math.random() < 0.4) {
        destination = bot.home
      } else if (!isRaining && Math.random() < 0.3) {
        destination = '深圳湾公园'
      } else {
        destination = pick(LOCATION_NAMES.filter(l => l !== bot.location) as string[])
      }
    } else {
      destination = bot.home
    }

    bot.location = destination
  }

  // ── Activity ──
  const locationActivities = ACTIVITIES[bot.location] ?? ['闲逛']
  bot.current_activity = pick(locationActivities)

  // ── Emotions ──
  const locType = world.locations[bot.location]?.type
  if (locType === 'leisure') {
    bot.emotions.happiness = drift(bot.emotions.happiness, 5, 0, 100)
    bot.emotions.anxiety = drift(bot.emotions.anxiety, -3, 0, 100)
    bot.emotions.loneliness = drift(bot.emotions.loneliness, -2, 0, 100)
  } else if (locType === 'business') {
    bot.emotions.anxiety = drift(bot.emotions.anxiety, 4, 0, 100)
    bot.emotions.happiness = drift(bot.emotions.happiness, 2, 0, 100)
  } else {
    bot.emotions.happiness = drift(bot.emotions.happiness, 3, 0, 100)
    bot.emotions.sadness = drift(bot.emotions.sadness, 3, 0, 100)
    bot.emotions.loneliness = drift(bot.emotions.loneliness, 3, 0, 100)
  }
  bot.emotions.anger = drift(bot.emotions.anger, 2, 0, 100)

  // ── Energy / satiety decay ──
  bot.energy = clamp(bot.energy - (2 + Math.random() * 2), 0, 100)
  bot.satiety = clamp(bot.satiety - (1 + Math.random() * 2), 0, 100)
  bot.phone_battery = clamp(bot.phone_battery - (1 + Math.random()), 0, 100)

  // Eating at commercial/residential boosts satiety
  if (bot.satiety < 40 && (locType === 'commercial' || locType === 'residential') && Math.random() < 0.3) {
    bot.satiety = clamp(bot.satiety + 30, 0, 100)
    bot.money -= Math.floor(15 + Math.random() * 20)
    bot.current_activity = '在附近吃了点东西'
  }

  // ── Money ──
  const workLoc = WORK_LOCATIONS[bot.id]
  if (workLoc && bot.location === workLoc && hour >= 9 && hour < 18) {
    const job = world.locations[workLoc]?.jobs?.[0]
    if (job) bot.money += Math.floor(job.pay * (0.8 + Math.random() * 0.4) / 8)
  }

  // ── Action log ──
  bot.action_log.push({
    tick,
    time: formatTime(tick),
    plan: bot.current_activity,
    result: { narrative: `${bot.name}${bot.current_activity}` },
  })
  if (bot.action_log.length > 20) {
    bot.action_log = bot.action_log.slice(-20)
  }

  return bot
}
