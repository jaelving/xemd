import React, { useCallback, useEffect, useRef, useState } from 'react';
import micromatch from 'micromatch';
import type { WidgetManifest } from '@xemd/widget-types';

interface WidgetFrameProps {
  widgetId: string;
  source: 'official' | 'community';
  manifest: WidgetManifest;
  settings: Record<string, unknown>;
}

interface XemdRequest {
  type: 'xemd:request';
  id: string;
  method: string;
  payload: unknown;
}

function matchGlob(pattern: string, url: string): boolean {
  return micromatch.isMatch(url, pattern, { dot: true });
}

// Pick the declared widget size whose aspect-ratio scale factor is closest to
// 1.0 for the given container. Closest-to-1 means the least CSS scaling is
// applied, so the widget renders as close to its native design as possible.
function pickBestSize(
  sizes: Array<{ w: number; h: number }>,
  container: { w: number; h: number },
): { w: number; h: number } {
  if (container.w === 0 || container.h === 0) return sizes[0];
  return sizes.reduce((best, candidate) => {
    const scaleA = Math.min(container.w / best.w,      container.h / best.h);
    const scaleB = Math.min(container.w / candidate.w, container.h / candidate.h);
    return Math.abs(1 - scaleB) < Math.abs(1 - scaleA) ? candidate : best;
  });
}

export function WidgetFrame({ widgetId, source, manifest, settings }: WidgetFrameProps) {
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready,         setReady]         = useState(false);
  const [timedOut,      setTimedOut]      = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    setContainerSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  const dims   = pickBestSize(manifest.dimensions, containerSize);
  const scaleX = containerSize.w > 0 ? containerSize.w / dims.w : 1;
  const scaleY = containerSize.h > 0 ? containerSize.h / dims.h : 1;
  const scale  = Math.min(scaleX, scaleY);
  const offsetX = Math.round((containerSize.w - dims.w * scale) / 2);
  const offsetY = Math.round((containerSize.h - dims.h * scale) / 2);

  const sendResponse = useCallback(
    (id: string, result?: unknown, error?: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'xemd:response', id, result, error },
        '*', // sandboxed iframes have origin 'null' — '*' is required for delivery
      );
    },
    [],
  );

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const data = event.data as Partial<XemdRequest>;
      if (data?.type !== 'xemd:request') return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const { id, method, payload } = data as XemdRequest;

      try {
        switch (method) {
          case 'ready':
            setReady(true);
            sendResponse(id, null);
            break;

          case 'settings.get':
            sendResponse(id, settings);
            break;

          case 'proxy.fetch': {
            const p = payload as { url: string; method: string; headers: Record<string, string>; body: string | null };
            if (!manifest.permissions.proxy.some(glob => matchGlob(glob, p.url))) {
              sendResponse(id, undefined, `proxy: URL not permitted by manifest: ${p.url}`);
              return;
            }
            try {
              const apiRes = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ widgetId, url: p.url, method: p.method, headers: p.headers, body: p.body }),
              });
              if (!apiRes.ok) {
                // /api/proxy itself errored — surface the message so the widget can display it
                const body = await apiRes.json().catch(() => ({})) as Record<string, unknown>;
                sendResponse(id, undefined, typeof body.error === 'string' ? body.error : `proxy error: HTTP ${apiRes.status}`);
                return;
              }
              sendResponse(id, await apiRes.json());
            } catch (err) {
              sendResponse(id, undefined, err instanceof Error ? err.message : 'proxy fetch failed');
            }
            break;
          }

          case 'secrets.get': {
            const p = payload as { key: string };
            if (!manifest.permissions.secrets.includes(p.key)) {
              sendResponse(id, undefined, `secrets: key not permitted by manifest: ${p.key}`);
              return;
            }
            try {
              const apiRes = await fetch(`/api/widget-secrets/${widgetId}/${encodeURIComponent(p.key)}`);
              sendResponse(id, await apiRes.json());
            } catch (err) {
              sendResponse(id, undefined, err instanceof Error ? err.message : 'secrets fetch failed');
            }
            break;
          }

          default:
            sendResponse(id, undefined, `unknown method: ${method}`);
        }
      } catch (err) {
        sendResponse(id, undefined, err instanceof Error ? err.message : 'internal error');
      }
    },
    [widgetId, manifest, settings, sendResponse],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [ready]);

  if (timedOut && !ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#0a0a0a', color: '#ef4444' }}>
        Widget failed to load (timeout)
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}
    >
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a', color: '#666',
        }}>
          Loading widget…
        </div>
      )}

      {containerSize.w > 0 && (
        <iframe
          ref={iframeRef}
          src={`/widgets/${source}/${widgetId}/index.html`}
          sandbox="allow-scripts"
          style={{
            position:        'absolute',
            width:           dims.w,
            height:          dims.h,
            border:          'none',
            display:         'block',
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
            left:            offsetX,
            top:             offsetY,
          }}
          title={manifest.name}
        />
      )}
    </div>
  );
}
