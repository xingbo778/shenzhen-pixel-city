/**
 * News and event generator — creates world events and news headlines.
 */

import type { WorldState } from './seedData.js'

const NEWS_TEMPLATES = [
  { tpl: '南山科技园某公司完成新一轮融资', source: '深圳日报' },
  { tpl: '华强北电子市场行情波动，商家积极应对', source: '南方都市报' },
  { tpl: '深圳湾公园周末将举办户外活动，预计大量市民参与', source: '深圳特区报' },
  { tpl: '福田CBD写字楼租金出现新变化', source: '经济观察报' },
  { tpl: '宝安城中村改造计划公示，居民反应不一', source: '深圳晚报' },
  { tpl: '东门老街美食节即将开幕', source: '深圳日报' },
  { tpl: '深圳地铁新线路规划公布，南山将新增三个站点', source: '南方都市报' },
  { tpl: '深圳今年GDP增速领跑全国主要城市', source: '经济观察报' },
  { tpl: '华强北直播带货成新趋势，年轻商家纷纷转型', source: '深圳特区报' },
  { tpl: '深圳人才补贴政策更新，应届毕业生可享多项优惠', source: '深圳日报' },
]

const EVENT_TEMPLATES = [
  { event: '经济波动', desc: '深圳房价出现新一轮变化，引发市民热议' },
  { event: '天气预警', desc: '气象台发布高温黄色预警' },
  { event: '社会事件', desc: '南山区举办创新创业大赛，吸引百家企业参加' },
  { event: '文化活动', desc: '深圳湾公园举办周末音乐节' },
  { event: '市政建设', desc: '深圳新一批公共设施建设项目启动' },
  { event: '交通变化', desc: '深圳高速路段施工，预计对通勤有一定影响' },
]

const HOT_TOPIC_POOLS = [
  ['深漂生存指南', '宝安城中村改造', '南山码农996', '华强北最新行情'],
  ['深圳房价走势', '科技园加班文化', '城中村美食', '深圳湾跑步'],
  ['福田CBD租金', '华强北直播', '深圳人才政策', '东门老街美食'],
  ['深圳地铁规划', '宝安工厂招工', '南山公寓租金', '深圳周末去哪'],
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatTime(tick: number): string {
  const hour = tick % 24
  const day = Math.floor(tick / 24) + 1
  return `2025-04-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`
}

export function maybeGenerateNews(
  world: WorldState,
  tick: number,
): { headline: string; source: string; tick: number; time: string } | null {
  if (Math.random() > 0.1) return null
  const t = pick(NEWS_TEMPLATES)
  return { headline: t.tpl, source: t.source, tick, time: formatTime(tick) }
}

export function maybeGenerateEvent(
  world: WorldState,
  tick: number,
): { tick: number; time: string; event: string; desc: string } | null {
  if (Math.random() > 0.08) return null
  const t = pick(EVENT_TEMPLATES)
  return { tick, time: formatTime(tick), event: t.event, desc: t.desc }
}

export function maybeRotateHotTopics(tick: number, current: string[]): string[] {
  if (tick % 50 !== 0) return current
  return pick(HOT_TOPIC_POOLS)
}
