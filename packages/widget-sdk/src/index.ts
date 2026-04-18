// Widget SDK — stub for Step 2
// Widgets import this via /sdk/widget-sdk.js served by the API

export type Settings = Record<string, string | number | boolean>;
export type RefreshCallback = () => void;
export type SettingsChangeCallback = (settings: Settings) => void;

export interface XemdSDK {
  settings: {
    get(): Promise<Settings>;
  };
  proxy: {
    fetch(url: string, init?: RequestInit): Promise<Response>;
  };
  secrets: {
    get(key: string): Promise<string | null>;
  };
  onRefresh(cb: RefreshCallback): void;
  onSettingsChange(cb: SettingsChangeCallback): void;
  ready(): void;
}

// Actual runtime implementation lives in the browser build served at /sdk/widget-sdk.js
// This file is the TypeScript type stub used during development.
export declare const xemd: XemdSDK;
