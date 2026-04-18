import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, ArrowLeft, Boxes, Sun, Moon } from 'lucide-react';
import { useWidgets, useToggleWidget } from './useWidgets';
import type { WidgetInfo } from './useWidgets';
import { WidgetSettingsForm } from './WidgetSettingsForm';
import { useTheme } from './useTheme';

// Per-widget visual identity
interface WidgetMeta {
  emoji: string;
  color1: string;
  color2: string;
  accent: string;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  'clock':          { emoji: '🕐', color1: '#7c3aed', color2: '#4338ca', accent: '#818cf8' },
  'weather':        { emoji: '⛅', color1: '#0284c7', color2: '#1d4ed8', accent: '#38bdf8' },
  'crypto':         { emoji: '₿',  color1: '#d97706', color2: '#c2410c', accent: '#fbbf24' },
  'f1-schedule':    { emoji: '🏎️', color1: '#dc2626', color2: '#9f1239', accent: '#f87171' },
  'stock-tracker':  { emoji: '📈', color1: '#059669', color2: '#0f766e', accent: '#34d399' },
  'flight-tracker': { emoji: '✈️', color1: '#0369a1', color2: '#1e3a5f', accent: '#38bdf8' },
  'calendar':       { emoji: '📅', color1: '#0f766e', color2: '#065f46', accent: '#2dd4bf' },
  'countdown':      { emoji: '⏳', color1: '#7c3aed', color2: '#6d28d9', accent: '#c4b5fd' },
};
const DEFAULT_META: WidgetMeta = { emoji: '🧩', color1: '#52525b', color2: '#3f3f46', accent: '#a1a1aa' };

function getMeta(id: string): WidgetMeta {
  return WIDGET_META[id] ?? DEFAULT_META;
}

// Widget card
function WidgetCard({
  widget,
  isSelected,
  onSelect,
  onToggle,
}: {
  widget: WidgetInfo;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const meta = getMeta(widget.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      className="relative flex flex-col gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 select-none"
      style={{
        background: isSelected ? 'var(--card-bg-selected)' : 'var(--card-bg)',
        borderColor: isSelected ? meta.accent + '55' : 'var(--card-border)',
        boxShadow: isSelected ? `0 0 0 1px ${meta.accent}33 inset, 0 8px 32px rgba(0,0,0,0.1)` : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${meta.color1}, ${meta.color2})` }}
        >
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-semibold text-base text-zinc-900 dark:text-white leading-tight truncate">
            {widget.name}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
            {widget.description}
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 pt-0.5"
          title={widget.enabled ? 'Disable widget' : 'Enable widget'}
        >
          {widget.enabled
            ? <ToggleRight className="w-6 h-6 text-emerald-500" />
            : <ToggleLeft  className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
          }
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 font-mono">
          v{widget.version}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 capitalize">
          {widget.source}
        </span>
        {widget.enabled
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Enabled</span>
          : <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700/60">Disabled</span>
        }
        {isSelected && (
          <span className="ml-auto text-[11px] font-semibold" style={{ color: meta.accent }}>
            ● Configuring
          </span>
        )}
      </div>
    </div>
  );
}

// Admin panel root
export function AdminPanel() {
  const { data: widgets, isLoading, isError } = useWidgets();
  const toggleWidget = useToggleWidget();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const selected     = widgets?.find(w => w.id === selectedId) ?? null;
  const selectedMeta = selected ? getMeta(selected.id) : null;
  const enabledCount = widgets?.filter(w => w.enabled).length ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-zinc-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading widgets…</p>
        </div>
      </div>
    );
  }

  if (isError || !widgets) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center">
        <p className="text-red-500 dark:text-red-400 text-sm">Failed to load widgets. Is the API running?</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col">

      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg, #dc2626, #9f1239)' }}>
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">XEMD</span>
            <span className="text-zinc-300 dark:text-zinc-600 font-light">/</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Admin</span>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {enabledCount} enabled
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun  className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            <a
              href="#/"
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to kiosk
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Widgets</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Click a card to configure its settings. Use the toggle to enable or disable a widget.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map(w => (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  isSelected={selected?.id === w.id}
                  onSelect={() => setSelectedId(w.id === selectedId ? null : w.id)}
                  onToggle={() => toggleWidget.mutate({ id: w.id, enabled: !w.enabled })}
                />
              ))}
            </div>
          </div>
        </main>

        {selected && selectedMeta && (
          <aside className="w-[400px] shrink-0 border-l border-zinc-200 dark:border-zinc-800/80 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/30">
            <div
              className="px-6 pt-6 pb-5 border-b border-zinc-200 dark:border-zinc-800/80"
              style={{ background: `linear-gradient(135deg, ${selectedMeta.color1}14, ${selectedMeta.color2}08)` }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-md"
                  style={{ background: `linear-gradient(135deg, ${selectedMeta.color1}, ${selectedMeta.color2})` }}
                >
                  {selectedMeta.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{selected.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{selected.description}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 font-mono">
                  v{selected.version}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 capitalize">
                  {selected.source}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {selected.author}
                </span>
              </div>
            </div>

            <div className="px-6 py-6">
              <WidgetSettingsForm
                widgetId={selected.id}
                settings={selected.settings}
                currentValues={selected.currentValues}
              />
            </div>
          </aside>
        )}

        {!selected && (
          <aside className="w-[320px] shrink-0 border-l border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-3 text-center p-8 bg-zinc-50 dark:bg-transparent">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-2xl">
              🧩
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No widget selected</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 leading-relaxed">
              Click a widget card to view and edit its configuration.
            </p>
          </aside>
        )}

      </div>
    </div>
  );
}
