/**
 * Seed data for the world engine — initial state cloned from mock data patterns.
 * Self-contained: no imports from client/ paths.
 */

// Re-export minimal types needed by the engine (mirrors client/src/types/world.ts)
export interface Emotions { happiness: number; sadness: number; anger: number; anxiety: number; loneliness: number }
export interface Skills { tech: number; social: number; creative: number; physical: number }
export interface Desires { lust: number; power: number; greed: number; vanity: number; security: number }
export interface Reputation { score: number; tags: string[]; deeds: string[] }
export interface ActionLog { tick: number; time: string; plan: string; action?: { category?: string; type?: string; desc?: string }; result?: { narrative?: string } }

export interface BotState {
  id: string; name: string; age: number; gender: string; origin: string; edu: string
  home: string; location: string; hp: number; money: number; energy: number; satiety: number
  status: 'alive' | 'dead'; job: string | null; skills: Skills; is_sleeping: boolean
  current_task: string | null; emotions: Emotions; desires: Desires; phone_battery: number
  aging_rate: number; current_activity: string; reputation: Reputation
  long_term_goal: string | null; narrative_summary: string | null; action_log: ActionLog[]
  generation: number; inherited_from: string | null; occupation?: string
}

export interface LocationState {
  desc: string; type: 'residential' | 'business' | 'commercial' | 'leisure'
  bots: string[]; npcs: { name: string; role: string }[]
  jobs: { title: string; pay: number }[]
  public_memory: { event: string; actor: string; tick: number; impact: string }[]
  vibe: string
}

export interface WorldState {
  time: { tick: number; virtual_hour: number; virtual_day: number; virtual_datetime: string }
  weather: { current: string; desc: string; changed_at_tick: number }
  news_feed: { headline: string; source: string; tick: number; time: string }[]
  hot_topics: string[]
  bots: Record<string, BotState>
  locations: Record<string, LocationState>
  events: { tick: number; time: string; event: string; desc: string }[]
  world_narrative: string
  world_modifications: { name: string; description: string; type: string; creator: string; creator_name: string; location: string; tick: number; time: string }[]
  generation_count: number
  graveyard: BotState[]
}

export interface Moment {
  id: string; bot_id: string; bot_name: string; content: string; image_url?: string
  tick: number; time: string; likes: string[]; comments: { bot_id: string; bot_name: string; content: string; tick: number }[]
}

export const LOCATION_NAMES = ['宝安城中村', '南山科技园', '福田CBD', '华强北', '东门老街', '南山公寓', '深圳湾公园'] as const

export function createInitialWorldState(): WorldState {
  return {
    time: { tick: 0, virtual_hour: 8, virtual_day: 1, virtual_datetime: '2025-04-01 08:00' },
    weather: { current: '晴天', desc: '深圳的清晨，阳光明媚', changed_at_tick: 0 },
    news_feed: [
      { headline: '南山科技园某初创公司完成A轮融资，估值破亿', source: '深圳日报', tick: 0, time: '2025-04-01 08:00' },
      { headline: '华强北电子市场迎来新一波采购潮', source: '南方都市报', tick: 0, time: '2025-04-01 07:30' },
    ],
    hot_topics: ['深漂生存指南', '宝安城中村改造', '南山码农996', '华强北最新行情'],
    bots: {
      bot_1: {
        id: 'bot_1', name: '陈志远', age: 28, gender: '男', origin: '湖南长沙',
        edu: '本科', home: '南山公寓', location: '南山公寓',
        hp: 90, money: 4200, energy: 85, satiety: 80, status: 'alive',
        job: '前端工程师', is_sleeping: false, current_task: '准备上班',
        current_activity: '在家吃早餐，准备出门',
        emotions: { happiness: 60, sadness: 10, anger: 10, anxiety: 40, loneliness: 20 },
        desires: { lust: 20, power: 40, greed: 35, vanity: 25, security: 70 },
        skills: { tech: 78, social: 45, creative: 55, physical: 40 },
        phone_battery: 100, aging_rate: 1.0,
        reputation: { score: 12, tags: ['技术达人', '加班狂人'], deeds: [] },
        long_term_goal: '在深圳买一套属于自己的房子', narrative_summary: '新的一天开始了。',
        action_log: [], generation: 1, inherited_from: null, occupation: '程序员',
      },
      bot_2: {
        id: 'bot_2', name: '林晓雯', age: 26, gender: '女', origin: '广东汕头',
        edu: '硕士', home: '南山公寓', location: '南山公寓',
        hp: 95, money: 12800, energy: 90, satiety: 85, status: 'alive',
        job: '金融分析师', is_sleeping: false, current_task: '准备上班',
        current_activity: '化妆准备出门上班',
        emotions: { happiness: 70, sadness: 10, anger: 10, anxiety: 30, loneliness: 20 },
        desires: { lust: 30, power: 65, greed: 55, vanity: 60, security: 50 },
        skills: { tech: 55, social: 72, creative: 48, physical: 55 },
        phone_battery: 100, aging_rate: 1.0,
        reputation: { score: 28, tags: ['职场精英', '社交达人'], deeds: [] },
        long_term_goal: '晋升为部门总监，年薪百万', narrative_summary: '新的一天，充满干劲。',
        action_log: [], generation: 1, inherited_from: null, occupation: '金融人',
      },
      bot_3: {
        id: 'bot_3', name: '王大柱', age: 35, gender: '男', origin: '河南郑州',
        edu: '高中', home: '宝安城中村', location: '宝安城中村',
        hp: 70, money: 820, energy: 75, satiety: 60, status: 'alive',
        job: '建筑工人', is_sleeping: false, current_task: '找活儿',
        current_activity: '在村口吃早餐',
        emotions: { happiness: 35, sadness: 35, anger: 20, anxiety: 55, loneliness: 55 },
        desires: { lust: 25, power: 15, greed: 45, vanity: 10, security: 85 },
        skills: { tech: 20, social: 50, creative: 30, physical: 85 },
        phone_battery: 80, aging_rate: 1.2,
        reputation: { score: 5, tags: ['老实人', '力气大'], deeds: [] },
        long_term_goal: '多攒点钱，回老家给儿子盖房子', narrative_summary: '又是找活儿的一天。',
        action_log: [], generation: 1, inherited_from: null, occupation: '工人',
      },
      bot_4: {
        id: 'bot_4', name: '赵美琪', age: 24, gender: '女', origin: '四川成都',
        edu: '本科', home: '南山公寓', location: '南山公寓',
        hp: 95, money: 2100, energy: 90, satiety: 75, status: 'alive',
        job: 'UI设计师', is_sleeping: false, current_task: '上班',
        current_activity: '在家收拾准备出门',
        emotions: { happiness: 75, sadness: 5, anger: 5, anxiety: 20, loneliness: 15 },
        desires: { lust: 35, power: 25, greed: 20, vanity: 70, security: 40 },
        skills: { tech: 60, social: 65, creative: 88, physical: 70 },
        phone_battery: 95, aging_rate: 1.0,
        reputation: { score: 18, tags: ['创意达人', '生活美学'], deeds: [] },
        long_term_goal: '开一家自己的设计工作室', narrative_summary: '心情不错的一天。',
        action_log: [], generation: 1, inherited_from: null, occupation: '设计师',
      },
      bot_5: {
        id: 'bot_5', name: '刘浩然', age: 32, gender: '男', origin: '北京',
        edu: '硕士', home: '福田CBD', location: '福田CBD',
        hp: 80, money: 85000, energy: 70, satiety: 65, status: 'alive',
        job: '创业公司CEO', is_sleeping: false, current_task: '融资',
        current_activity: '早起查看邮件',
        emotions: { happiness: 50, sadness: 15, anger: 20, anxiety: 70, loneliness: 35 },
        desires: { lust: 20, power: 90, greed: 80, vanity: 75, security: 30 },
        skills: { tech: 65, social: 85, creative: 70, physical: 45 },
        phone_battery: 90, aging_rate: 1.1,
        reputation: { score: 45, tags: ['创业者', '融资高手'], deeds: [] },
        long_term_goal: '把公司做到上市', narrative_summary: '今天有重要会议。',
        action_log: [], generation: 1, inherited_from: null, occupation: '创业者',
      },
      bot_6: {
        id: 'bot_6', name: '陈小花', age: 22, gender: '女', origin: '广东梅州',
        edu: '大专', home: '宝安城中村', location: '宝安城中村',
        hp: 88, money: 1560, energy: 80, satiety: 70, status: 'alive',
        job: '电子配件销售', is_sleeping: false, current_task: '开店',
        current_activity: '准备出门去华强北',
        emotions: { happiness: 60, sadness: 15, anger: 15, anxiety: 35, loneliness: 40 },
        desires: { lust: 25, power: 20, greed: 50, vanity: 40, security: 65 },
        skills: { tech: 45, social: 70, creative: 35, physical: 60 },
        phone_battery: 85, aging_rate: 1.0,
        reputation: { score: 8, tags: ['砍价高手', '勤快'], deeds: [] },
        long_term_goal: '存够钱开一家自己的网店', narrative_summary: '又是忙碌的一天。',
        action_log: [], generation: 1, inherited_from: null, occupation: '商人',
      },
      bot_7: {
        id: 'bot_7', name: '张国强', age: 45, gender: '男', origin: '湖北武汉',
        edu: '本科', home: '宝安城中村', location: '宝安城中村',
        hp: 72, money: 6800, energy: 70, satiety: 75, status: 'alive',
        job: '餐饮老板', is_sleeping: false, current_task: '备货',
        current_activity: '准备去东门老街开店',
        emotions: { happiness: 55, sadness: 20, anger: 25, anxiety: 40, loneliness: 45 },
        desires: { lust: 15, power: 30, greed: 55, vanity: 20, security: 75 },
        skills: { tech: 25, social: 60, creative: 55, physical: 70 },
        phone_battery: 75, aging_rate: 1.1,
        reputation: { score: 22, tags: ['厨艺精湛', '老实商人'], deeds: [] },
        long_term_goal: '把餐馆开成连锁', narrative_summary: '今天要多备点货。',
        action_log: [], generation: 1, inherited_from: null, occupation: '餐馆老板',
      },
      bot_8: {
        id: 'bot_8', name: '李梦婷', age: 29, gender: '女', origin: '江苏南京',
        edu: '本科', home: '南山公寓', location: '南山公寓',
        hp: 88, money: 5600, energy: 85, satiety: 78, status: 'alive',
        job: '产品经理', is_sleeping: false, current_task: '上班',
        current_activity: '吃完早餐准备出门',
        emotions: { happiness: 65, sadness: 10, anger: 15, anxiety: 45, loneliness: 20 },
        desires: { lust: 30, power: 55, greed: 40, vanity: 50, security: 55 },
        skills: { tech: 58, social: 78, creative: 72, physical: 50 },
        phone_battery: 100, aging_rate: 1.0,
        reputation: { score: 20, tags: ['产品思维', '用户导向'], deeds: [] },
        long_term_goal: '做出一款真正改变用户生活的产品', narrative_summary: '今天有用户调研。',
        action_log: [], generation: 1, inherited_from: null, occupation: '产品经理',
      },
    },
    locations: {
      '宝安城中村': { desc: '密集的握手楼，廉价的出租屋，外来务工人员的聚居地', type: 'residential', bots: ['bot_3', 'bot_6', 'bot_7'], npcs: [{ name: '房东老李', role: '收租' }, { name: '工头老王', role: '招工' }], jobs: [{ title: '建筑工人', pay: 80 }, { title: '快递员', pay: 60 }], public_memory: [], vibe: '拥挤嘈杂' },
      '南山科技园': { desc: '深圳科技创新的心脏，汇聚了无数互联网大厂和初创公司', type: 'business', bots: [], npcs: [{ name: '前台小姐姐', role: '接待' }, { name: '保安大叔', role: '安保' }], jobs: [{ title: '程序员', pay: 200 }, { title: '产品经理', pay: 180 }, { title: '运营', pay: 120 }], public_memory: [], vibe: '高压充实' },
      '福田CBD': { desc: '深圳的金融中心，高楼林立', type: 'business', bots: ['bot_5'], npcs: [{ name: '投资人王总', role: '投资' }, { name: '咖啡师', role: '服务' }], jobs: [{ title: '金融分析师', pay: 250 }, { title: '律师助理', pay: 150 }], public_memory: [], vibe: '商业气息浓厚' },
      '华强北': { desc: '全球最大的电子元器件集散地', type: 'commercial', bots: [], npcs: [{ name: '档口老板', role: '销售' }, { name: '黄牛阿强', role: '倒卖' }], jobs: [{ title: '销售员', pay: 100 }, { title: '配件采购', pay: 90 }], public_memory: [], vibe: '热闹繁忙' },
      '东门老街': { desc: '深圳最古老的商业街区', type: 'commercial', bots: [], npcs: [{ name: '算命先生', role: '算命' }, { name: '老街坊', role: '闲聊' }], jobs: [{ title: '餐饮服务员', pay: 70 }, { title: '小贩', pay: 50 }], public_memory: [], vibe: '烟火气十足' },
      '南山公寓': { desc: '南山区的普通住宅区', type: 'residential', bots: ['bot_1', 'bot_2', 'bot_4', 'bot_8'], npcs: [{ name: '物业大爷', role: '管理' }], jobs: [], public_memory: [], vibe: '安静宜居' },
      '深圳湾公园': { desc: '深圳最美的滨海公园', type: 'leisure', bots: [], npcs: [{ name: '晨跑大妈', role: '锻炼' }, { name: '钓鱼老伯', role: '垂钓' }], jobs: [], public_memory: [], vibe: '清新舒适' },
    },
    events: [],
    world_narrative: '新的一天开始了。8个来自五湖四海的人，在深圳这座城市里各自挣扎、奋斗、寻找属于自己的位置。',
    world_modifications: [],
    generation_count: 1,
    graveyard: [],
  }
}

export function createInitialMoments(): Moment[] {
  return []
}
