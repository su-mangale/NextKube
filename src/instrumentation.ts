export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const http = (await import('http')).default;
    const { attachTerminalWebSocket } = await import('@/server/terminal-ws');

    const attachIfServerReady = () => {
      const handles = (process as any)._getActiveHandles?.() || [];
      const httpServers = handles.filter(
        (h: any) =>
          h instanceof http.Server ||
          (h && typeof h.emit === 'function' && h._events && (h._events.request || h._events.upgrade))
      );
      if (httpServers.length > 0) {
        attachTerminalWebSocket(httpServers[0]);
        return true;
      }
      return false;
    };

    if (!attachIfServerReady()) {
      const interval = setInterval(() => {
        if (attachIfServerReady()) {
          clearInterval(interval);
        }
      }, 50);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }
}
