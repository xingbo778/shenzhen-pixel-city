import { z } from "zod";
import type { Moment, WorldState } from "@/types/world";

const emotionsSchema = z.object({
  happiness: z.number(),
  sadness: z.number(),
  anger: z.number(),
  anxiety: z.number(),
  loneliness: z.number(),
});

const skillsSchema = z.object({
  tech: z.number(),
  social: z.number(),
  creative: z.number(),
  physical: z.number(),
});

const desiresSchema = z.object({
  lust: z.number(),
  power: z.number(),
  greed: z.number(),
  vanity: z.number(),
  security: z.number(),
});

const reputationSchema = z.object({
  score: z.number(),
  tags: z.array(z.string()),
  deeds: z.array(z.string()),
});

const actionLogSchema = z.object({
  tick: z.number(),
  time: z.string(),
  plan: z.string(),
  action: z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    desc: z.string().optional(),
  }).optional(),
  result: z.object({
    narrative: z.string().optional(),
  }).optional(),
});

const botSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.string(),
  origin: z.string(),
  edu: z.string(),
  home: z.string(),
  location: z.string(),
  hp: z.number(),
  money: z.number(),
  energy: z.number(),
  satiety: z.number(),
  status: z.enum(["alive", "dead"]),
  job: z.string().nullable(),
  skills: skillsSchema,
  is_sleeping: z.boolean(),
  current_task: z.string().nullable(),
  emotions: emotionsSchema,
  desires: desiresSchema,
  phone_battery: z.number(),
  aging_rate: z.number(),
  current_activity: z.string(),
  reputation: reputationSchema,
  long_term_goal: z.string().nullable(),
  narrative_summary: z.string().nullable(),
  action_log: z.array(actionLogSchema),
  generation: z.number(),
  inherited_from: z.string().nullable(),
  occupation: z.string().optional(),
});

const locationSchema = z.object({
  desc: z.string(),
  type: z.enum(["residential", "business", "commercial", "leisure"]),
  bots: z.array(z.string()),
  npcs: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })),
  jobs: z.array(z.object({
    title: z.string(),
    pay: z.number(),
  })),
  public_memory: z.array(z.union([
    z.string(),
    z.object({
      event: z.string(),
      actor: z.string(),
      tick: z.number(),
      impact: z.string(),
    }),
  ])),
  vibe: z.string(),
});

const worldSchema = z.object({
  time: z.object({
    tick: z.number(),
    virtual_hour: z.number(),
    virtual_day: z.number(),
    virtual_datetime: z.string(),
  }),
  weather: z.object({
    current: z.string(),
    desc: z.string(),
    changed_at_tick: z.number(),
  }),
  news_feed: z.array(z.object({
    headline: z.string(),
    source: z.string(),
    tick: z.number(),
    time: z.string(),
  })),
  hot_topics: z.array(z.string()),
  bots: z.record(z.string(), botSchema),
  locations: z.record(z.string(), locationSchema),
  events: z.array(z.object({
    tick: z.number(),
    time: z.string(),
    event: z.string(),
    desc: z.string(),
  })),
  world_narrative: z.string(),
  world_modifications: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.string(),
    creator: z.string(),
    creator_name: z.string(),
    location: z.string(),
    tick: z.number(),
    time: z.string(),
  })),
  generation_count: z.number(),
  graveyard: z.array(botSchema),
});

const momentSchema = z.object({
  id: z.string(),
  bot_id: z.string(),
  bot_name: z.string(),
  content: z.string(),
  image_url: z.string().optional(),
  tick: z.number(),
  time: z.string(),
  likes: z.array(z.string()),
  comments: z.array(z.object({
    bot_id: z.string(),
    bot_name: z.string(),
    content: z.string(),
    tick: z.number(),
  })),
});

const momentsEnvelopeSchema = z.union([
  z.array(momentSchema),
  z.object({
    moments: z.array(momentSchema),
  }),
]);

export function parseWorldPayload(payload: unknown): WorldState {
  return worldSchema.parse(payload) as WorldState;
}

export function parseMomentsPayload(payload: unknown): Moment[] {
  const parsed = momentsEnvelopeSchema.parse(payload);
  return Array.isArray(parsed) ? parsed : parsed.moments;
}

