import React, { useState } from 'react';
import { Save, Lock, Check } from 'lucide-react';
import type { WidgetSetting } from '@xemd/widget-types';
import { useSaveSettings, useSaveSecret } from './useWidgets';

interface Props {
  widgetId: string;
  settings: WidgetSetting[];
  currentValues: Record<string, unknown>;
}

export function WidgetSettingsForm({ widgetId, settings, currentValues }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const s of settings) {
      if (s.type !== 'secret') {
        init[s.key] = currentValues[s.key] ?? ('default' in s ? s.default : '');
      }
    }
    return init;
  });
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const saveSettings = useSaveSettings();
  const saveSecret   = useSaveSecret();

  const nonSecretSettings = settings.filter(s => s.type !== 'secret');
  const secretSettings    = settings.filter(s => s.type === 'secret');

  async function handleSave() {
    await saveSettings.mutateAsync({ widgetId, settings: values });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderField(s: WidgetSetting) {
    if (s.type === 'secret') return null;
    const val = values[s.key];

    if (s.type === 'boolean') {
      return (
        <button
          onClick={() => setValues(v => ({ ...v, [s.key]: !v[s.key] }))}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200
            ${val ? 'bg-emerald-500 border-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
              ${val ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      );
    }

    if (s.type === 'enum') {
      return (
        <select
          value={String(val ?? '')}
          onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
          className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white w-full focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30 transition-colors"
        >
          {s.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (s.type === 'date') {
      return (
        <input
          type="date"
          value={String(val ?? '')}
          onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
          className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white w-full focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30 transition-colors [color-scheme:light] dark:[color-scheme:dark]"
        />
      );
    }

    if (s.type === 'number') {
      return (
        <input
          type="number"
          value={Number(val ?? 0)}
          min={s.min}
          max={s.max}
          onChange={e => setValues(v => ({ ...v, [s.key]: Number(e.target.value) }))}
          className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white w-full focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30 transition-colors"
        />
      );
    }

    // string default
    return (
      <input
        type="text"
        value={String(val ?? '')}
        onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
        className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white w-full focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30 transition-colors"
      />
    );
  }

  if (settings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-2xl">✓</span>
        <p className="text-sm text-zinc-500">No configurable settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Regular settings */}
      {nonSecretSettings.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Settings</p>
          {nonSecretSettings.map(s => (
            <div key={s.key} className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label ?? s.key}</label>
              {renderField(s)}
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saveSettings.isPending}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200
              ${saved
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }
            `}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved</>
            ) : saveSettings.isPending ? (
              <><div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-700 dark:border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </div>
      )}

      {/* Secrets */}
      {secretSettings.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Secrets</p>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600 leading-relaxed -mt-2">
            Stored encrypted at rest. Leave blank to keep the existing value.
          </p>
          {secretSettings.map(s => (
            <div key={s.key} className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label ?? s.key}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter new value…"
                  value={secretValues[s.key] ?? ''}
                  onChange={e => setSecretValues(v => ({ ...v, [s.key]: e.target.value }))}
                  className="flex-1 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30 transition-colors"
                />
                <button
                  onClick={async () => {
                    await saveSecret.mutateAsync({ widgetId, key: s.key, value: secretValues[s.key] ?? '' });
                    setSecretValues(v => ({ ...v, [s.key]: '' }));
                  }}
                  disabled={saveSecret.isPending || !secretValues[s.key]}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 dark:text-white rounded-lg text-sm transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
