import { DurableObject } from 'cloudflare:workers';

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

export class Room extends DurableObject<Env> {}

export default {
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
