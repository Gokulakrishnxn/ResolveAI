import { z } from 'zod';

export const clientToServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    storeKey: z.string().min(1),
    sessionId: z.string().min(1),
    visitor: z.object({
      email: z.string().email().optional(),
      name: z.string().optional(),
    }),
    pageUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('message'),
    sessionId: z.string().min(1),
    body: z.string().min(1).max(20_000),
  }),
  z.object({
    type: z.literal('typing'),
    sessionId: z.string().min(1),
  }),
]);
export type ClientToServerMessage = z.infer<typeof clientToServerMessageSchema>;

export const serverToClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    sessionId: z.string(),
    ticketId: z.string().optional(),
  }),
  z.object({
    type: z.literal('message'),
    role: z.enum(['AGENT', 'AI', 'SYSTEM']),
    body: z.string(),
    at: z.string(),
  }),
  z.object({ type: z.literal('typing'), role: z.enum(['AGENT', 'AI']) }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type ServerToClientMessage = z.infer<typeof serverToClientMessageSchema>;
