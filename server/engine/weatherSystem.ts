/**
 * Weather system — periodic weather transitions with weighted probabilities.
 */

const _WEATHER_TYPES = ['晴天', '多云', '小雨', '暴雨', '台风', '闷热', '凉爽'] as const

const WEATHER_DESC: Record<string, string[]> = {
  '晴天': ['阳光明媚，万里无云', '天气晴好，适合出门', '蓝天白云，心情不错'],
  '多云': ['云层厚重，偶有阳光', '天色阴沉，可能要下雨', '多云天气，略闷'],
  '小雨': ['淅淅沥沥的小雨，路上行人加快了脚步', '细雨蒙蒙，空气清新', '下着小雨，记得带伞'],
  '暴雨': ['倾盆大雨，路上积水', '暴雨如注，建议减少出行', '雷声隆隆，大雨倾盆'],
  '台风': ['台风来袭，风力猛烈', '台风天气，请注意安全', '狂风暴雨，街上几乎没人'],
  '闷热': ['闷热难耐，像在蒸笼里', '气温直逼35度，热浪滚滚', '又闷又热，汗流浃背'],
  '凉爽': ['凉风习习，很舒服', '气温适宜，秋高气爽', '凉爽的天气，适合散步'],
}

// Weighted transition probabilities from each weather type
const TRANSITIONS: Record<string, [string, number][]> = {
  '晴天': [['晴天', 3], ['多云', 4], ['闷热', 2], ['凉爽', 1]],
  '多云': [['多云', 2], ['晴天', 2], ['小雨', 3], ['闷热', 1], ['凉爽', 1]],
  '小雨': [['小雨', 2], ['多云', 3], ['暴雨', 2], ['凉爽', 1]],
  '暴雨': [['暴雨', 1], ['小雨', 3], ['多云', 2], ['台风', 1]],
  '台风': [['台风', 1], ['暴雨', 3], ['小雨', 2]],
  '闷热': [['闷热', 2], ['多云', 2], ['暴雨', 1], ['晴天', 2]],
  '凉爽': [['凉爽', 2], ['晴天', 3], ['多云', 2]],
}

function pickWeighted(transitions: [string, number][]): string {
  const total = transitions.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [weather, weight] of transitions) {
    roll -= weight
    if (roll <= 0) return weather
  }
  return transitions[0][0]
}

function pickDesc(weather: string): string {
  const descs = WEATHER_DESC[weather] ?? ['天气一般']
  return descs[Math.floor(Math.random() * descs.length)]
}

let nextChangeAtTick = 15 + Math.floor(Math.random() * 10)

export function maybeUpdateWeather(
  weather: { current: string; desc: string; changed_at_tick: number },
  tick: number,
): { current: string; desc: string; changed_at_tick: number } {
  if (tick < nextChangeAtTick) return weather

  const transitions = TRANSITIONS[weather.current] ?? TRANSITIONS['晴天']
  const next = pickWeighted(transitions)
  nextChangeAtTick = tick + 15 + Math.floor(Math.random() * 10)

  return {
    current: next,
    desc: pickDesc(next),
    changed_at_tick: tick,
  }
}

export function isOutdoorUnfriendly(weather: string): boolean {
  return ['暴雨', '台风'].includes(weather)
}
