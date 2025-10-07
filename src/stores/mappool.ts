import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMappoolStore = defineStore('mappool', () => {
  const mappool = ref<string[]>([]);
  let ws: WebSocket | null = null;

  function connectWebSocket(url: string) {
    ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data.mappool)) {
          mappool.value = data.mappool;
        }
      } catch (e) {
        // ignore parse error
      }
    };
    ws.onclose = () => {
      // 可选：自动重连
      setTimeout(() => connectWebSocket(url), 3000);
    };
  }

  function sendMappool(newMappool: string[]) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mappool', mappool: newMappool }));
    }
  }

  return { mappool, connectWebSocket, sendMappool };
});
