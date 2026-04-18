// XEMD Widget SDK — browser ESM module
// Widgets load this via: import { xemd } from '/sdk/widget-sdk.js';

function genId() {
  return Math.random().toString(36).slice(2);
}

function request(method, payload) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const handler = (event) => {
      if (event.data?.type !== 'xemd:response' || event.data.id !== id) return;
      window.removeEventListener('message', handler);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    window.addEventListener('message', handler);
    // Use '*' because sandboxed iframes have origin 'null', not the host origin.
    // The host validates event.source before acting on any message.
    window.parent.postMessage({ type: 'xemd:request', id, method, payload }, '*');
  });
}

export const xemd = {
  settings: {
    get() { return request('settings.get', null); }
  },
  proxy: {
    async fetch(url, init = {}) {
      const result = await request('proxy.fetch', {
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body ?? null,
      });
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        headers: new Headers(result.headers ?? {}),
        json() { return Promise.resolve(JSON.parse(result.body)); },
        text() { return Promise.resolve(result.body); },
      };
    }
  },
  secrets: {
    async get(key) {
      const result = await request('secrets.get', { key });
      return result?.value ?? null;
    }
  },
  onRefresh(cb) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'xemd:event' && event.data.name === 'refresh') cb();
    });
  },
  onSettingsChange(cb) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'xemd:event' && event.data.name === 'settingsChange') cb(event.data.data);
    });
  },
  ready() { return request('ready', null); }
};
