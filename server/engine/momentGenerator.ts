/**
 * Moment generator — create social media posts from bot activities.
 */

import type { BotState, Moment } from './seedData.js'

let nextMomentId = 1

const MOMENT_TEMPLATES: Record<string, string[]> = {
  '南山科技园': [
    '又是被代码折磨的一天，但终于搞定了！',
    '今天的需求改了三次，我微笑着接受了一切🙂',
    '科技园的食堂今天加了新菜，还行吧',
    '下班了！今天居然没加班，简直不敢相信',
  ],
  '福田CBD': [
    '在CBD的咖啡厅，看着窗外的高楼，感觉自己在努力靠近梦想',
    '今天的会议终于开完了，累到不行',
    '福田的夕阳很美，可惜都在加班看不到',
    '和客户的谈判进展顺利，干杯🍻',
  ],
  '华强北': [
    '华强北永远这么热闹，电子产品的天堂',
    '今天进了一批好货，利润不错💰',
    '华强北的行情变化真快，眼睛一闭一睁就变了',
    '和档口老板砍价成功，省了一大笔！',
  ],
  '东门老街': [
    '东门的烟火气让人感到安心',
    '今天生意不错，翻了好几桌',
    '东门的老街坊们，每天都有聊不完的话',
    '傍晚的东门特别有味道',
  ],
  '深圳湾公园': [
    '深圳湾的风真的好治愈🌊',
    '跑完步看到了超美的晚霞，值了！',
    '在海边坐了一下午，什么都不想，就是舒服',
    '今天拍到了很棒的照片，深圳还是很美的',
  ],
  '宝安城中村': [
    '城中村的夜晚，灯火通明，都是像我一样打拼的人',
    '今天在村口遇到老乡了，聊了很久',
    '房东又来催房租了😢',
    '村口的沙县小吃还是那个味道，便宜又好吃',
  ],
  '南山公寓': [
    '终于回家了，今天真的累',
    '窝在沙发上刷手机的快乐，谁懂啊',
    '自己做了顿饭，虽然不好看但味道还行',
    '深圳的夜晚，透过窗户看到万家灯火',
  ],
}

const COMMENT_TEMPLATES = [
  '加油！', '哈哈哈', '真的吗？', '羡慕了', '辛苦了！',
  '一起啊！', '深有同感', '太真实了', '顶！', '哇塞',
  '我也是', '下次带我', '太累了', '冲鸭💪', '好想去',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function maybeGenerateMoment(
  bot: BotState,
  tick: number,
  allBots: Record<string, BotState>,
): Moment | null {
  if (Math.random() > 0.05) return null
  if (bot.is_sleeping) return null

  const templates = MOMENT_TEMPLATES[bot.location] ?? MOMENT_TEMPLATES['南山公寓']
  const content = pick(templates)

  const otherBotIds = Object.keys(allBots).filter(id => id !== bot.id)
  const likeCount = Math.floor(Math.random() * 4)
  const likes = otherBotIds.sort(() => Math.random() - 0.5).slice(0, likeCount)

  const commentCount = Math.floor(Math.random() * 3)
  const commenters = otherBotIds.sort(() => Math.random() - 0.5).slice(0, commentCount)
  const comments = commenters.map(id => ({
    bot_id: id,
    bot_name: allBots[id].name,
    content: pick(COMMENT_TEMPLATES),
    tick,
  }))

  const hour = tick % 24
  const day = Math.floor(tick / 24) + 1
  const time = `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`

  return {
    id: `moment_${nextMomentId++}`,
    bot_id: bot.id,
    bot_name: bot.name,
    content,
    tick,
    time,
    likes,
    comments,
  }
}
