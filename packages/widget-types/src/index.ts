import { z } from 'zod';

const SettingBaseSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
});

const StringSettingSchema = SettingBaseSchema.extend({
  type: z.literal('string'),
  default: z.string().optional(),
});

const NumberSettingSchema = SettingBaseSchema.extend({
  type: z.literal('number'),
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const BooleanSettingSchema = SettingBaseSchema.extend({
  type: z.literal('boolean'),
  default: z.boolean().optional(),
});

const EnumSettingSchema = SettingBaseSchema.extend({
  type: z.literal('enum'),
  options: z.array(z.string()).min(1),
  default: z.string().optional(),
});

const DateSettingSchema = SettingBaseSchema.extend({
  type: z.literal('date'),
  default: z.string().optional(), // YYYY-MM-DD
});

const SecretSettingSchema = SettingBaseSchema.extend({
  type: z.literal('secret'),
});

export const SettingSchema = z.discriminatedUnion('type', [
  StringSettingSchema,
  NumberSettingSchema,
  BooleanSettingSchema,
  EnumSettingSchema,
  DateSettingSchema,
  SecretSettingSchema,
]);

export const WidgetManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase kebab-case'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver'),
  author: z.string().min(1),
  description: z.string().min(1),
  entry: z.string().regex(/^[a-zA-Z0-9_-]+\.html$/, 'entry must be a simple .html filename (no paths)').default('index.html'),
  dimensions: z.union([
    // Legacy single-object format — still accepted for backwards compatibility
    z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
    // New multi-size array format — one entry per supported display resolution
    z.array(z.object({ w: z.number().int().positive(), h: z.number().int().positive() })).min(1),
  // Always normalise to an array so consumers never need to branch
  ]).transform((d): Array<{ w: number; h: number }> => Array.isArray(d) ? d : [d]),
  refreshInterval: z.number().int().positive(),
  permissions: z.object({
    proxy: z.array(z.string()),
    secrets: z.array(z.string()),
  }),
  settings: z.array(SettingSchema).default([]),
});

export type WidgetManifest = z.infer<typeof WidgetManifestSchema>;
export type WidgetSetting = z.infer<typeof SettingSchema>;
