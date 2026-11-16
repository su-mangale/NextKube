import { NextRequest } from 'next/server';
import { evaluateClusterHealth, fetchEvents, fetchPods } from '@/server/k8s-client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: clusterId } = await props.params;

  let isAlive = true;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let pollTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const push = (event: string, data: any) => {
        if (!isAlive) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Client closed
        }
      };

      // 1. Initial Handshake
      push('connected', {
        clusterId,
        timestamp: new Date().toISOString(),
        message: 'Live cluster watch connected.',
      });

      // 2. Keep-alive heartbeat every 15 seconds
      heartbeatTimer = setInterval(() => {
        if (!isAlive) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // Stream closed
        }
      }, 15000);

      // 3. Periodic cluster change poll & push every 5 seconds
      let lastEventIds = new Set<string>();

      pollTimer = setInterval(async () => {
        if (!isAlive) return;
        try {
          const [events, health] = await Promise.all([
            fetchEvents(clusterId).catch(() => []),
            evaluateClusterHealth(clusterId).catch(() => null),
          ]);

          if (health) {
            push('health-update', health);
          }

          // Detect new Warning events
          const newEvents = events.filter((e) => !lastEventIds.has(e.id));
          if (newEvents.length > 0 && lastEventIds.size > 0) {
            push('new-events', newEvents);
          }
          lastEventIds = new Set(events.map((e) => e.id));
        } catch {
          // Suppress watch poll error
        }
      }, 5000);

      req.signal.addEventListener('abort', () => {
        isAlive = false;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (pollTimer) clearInterval(pollTimer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      isAlive = false;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
