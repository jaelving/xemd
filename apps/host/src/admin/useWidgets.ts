import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WidgetManifest } from '@xemd/widget-types';

function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = sessionStorage.getItem('xemd-admin-token') ?? '';
  return { 'Content-Type': 'application/json', 'X-Admin-Token': token, ...extra };
}

export interface WidgetInfo extends WidgetManifest {
  source: 'official' | 'community';
  enabled: boolean;
  currentValues: Record<string, unknown>;
}

export function useWidgets() {
  return useQuery<WidgetInfo[]>({
    queryKey: ['widgets'],
    queryFn: async () => {
      const res = await fetch('/api/widgets');
      if (!res.ok) throw new Error('Failed to load widgets');
      const raw: any[] = await res.json();
      return raw.map(w => ({
        ...w,
        currentValues: w.currentValues ?? {},
      })) as WidgetInfo[];
    },
  });
}

export function useToggleWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/widgets/${id}/state`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle widget');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widgets'] }),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ widgetId, settings }: { widgetId: string; settings: Record<string, unknown> }) => {
      const res = await fetch(`/api/settings/${widgetId}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widgets'] }),
  });
}

export function useSaveSecret() {
  return useMutation({
    mutationFn: async ({ widgetId, key, value }: { widgetId: string; key: string; value: string }) => {
      const res = await fetch(`/api/secrets/${widgetId}/${key}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Failed to save secret');
    },
  });
}
