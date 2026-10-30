import {
  contrast,
  type TokenKey,
  type Tokens,
  type TokenValue,
} from '../../app/shared/model.js';

// Analyse le CSS d'un site de référence et en déduit des valeurs pour nos tokens.
// Heuristique : les valeurs les plus fréquentes gagnent ; l'humain valide le diff.

export const scopes = ['colors', 'typography', 'spacing', 'radius'] as const;
export type Scope = (typeof scopes)[number];

type Count = Map<string, number>;
export interface StyleStats {
  background: Count;
  text: Count;
  border: Count;
  all: Count;
  families: Count;
  sizes: Count;
  spacing: Count;
  radius: Count;
}

const add = (m: Count, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const ranked = (m: Count) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

const hex2 = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
const rgbHex = (r: number, g: number, b: number) =>
  `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
function hslRgb(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255] as const;
}

// Couleur CSS → #RRGGBB, ou null si transparente, inconnue ou trop translucide.
export function toHex(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (v === 'white') return '#FFFFFF';
  if (v === 'black') return '#000000';
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length === 8 && parseInt(h.slice(6), 16) < 230) return null;
    return h.length >= 6 ? `#${h.slice(0, 6)}`.toUpperCase() : null;
  }
  m = v.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!m) return null;
  const parts = m[2].split(/[\s,/]+/).filter(Boolean);
  const alpha = parts[3]
    ? parts[3].endsWith('%')
      ? parseFloat(parts[3]) / 100
      : parseFloat(parts[3])
    : 1;
  if (!(alpha >= 0.9)) return null;
  const n = parts.slice(0, 3).map((p) => parseFloat(p));
  if (n.some((x) => Number.isNaN(x))) return null;
  if (m[1].startsWith('rgb')) {
    const rgb = parts
      .slice(0, 3)
      .map((p, i) => (p.endsWith('%') ? (n[i] * 255) / 100 : n[i]));
    return rgbHex(rgb[0], rgb[1], rgb[2]);
  }
  return rgbHex(...hslRgb(n[0], n[1] / 100, n[2] / 100));
}

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

// Mélange vers le blanc (amount > 0) ou le noir (amount < 0).
function shade(hex: string, amount: number) {
  const target = amount > 0 ? 255 : 0;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const t = Math.abs(amount);
  return rgbHex(
    r + (target - r) * t,
    g + (target - g) * t,
    b + (target - b) * t,
  );
}

const colorPattern =
  /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b(?:white|black)\b/gi;
const lengthPattern = /(-?\d*\.?\d+)(px|rem|em)\b/g;

// Garde le thème clair : ignore les blocs .dark, [data-theme=dark] et
// @media (prefers-color-scheme: dark), sinon fonds et textes se mélangent.
function lightCss(css: string) {
  const out: string[] = [];
  const dark: boolean[] = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const prelude = css.slice(start, i);
      const cut = prelude.lastIndexOf(';') + 1;
      const parent = dark.at(-1) ?? false;
      if (!parent) out.push(prelude.slice(0, cut));
      dark.push(parent || /dark/i.test(prelude.slice(cut)));
      start = i + 1;
    } else if (css[i] === '}') {
      if (!(dark.at(-1) ?? false)) out.push(css.slice(start, i) + ';');
      dark.pop();
      start = i + 1;
    }
  }
  return out.join('\n');
}

export function analyzeCss(css: string): StyleStats {
  const stats: StyleStats = {
    background: new Map(),
    text: new Map(),
    border: new Map(),
    all: new Map(),
    families: new Map(),
    sizes: new Map(),
    spacing: new Map(),
    radius: new Map(),
  };
  const clean = lightCss(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  // Les variables CSS portent souvent les tokens du site : on les résout un niveau.
  const vars = new Map<string, string>();
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g))
    vars.set(m[1], m[2].trim());
  const resolve = (value: string) =>
    value.replace(
      /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g,
      (_, name: string, fallback?: string) => vars.get(name) ?? fallback ?? '',
    );
  for (const m of clean.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    const prop = m[1];
    const value = resolve(m[2]).replace(/!important/g, '');
    for (const c of value.match(colorPattern) ?? []) {
      const hex = toHex(c);
      if (!hex) continue;
      add(stats.all, hex);
      if (prop === 'background' || prop === 'background-color')
        add(stats.background, hex);
      else if (prop === 'color') add(stats.text, hex);
      else if (prop.startsWith('border') || prop.startsWith('outline'))
        add(stats.border, hex);
    }
    const px = [...value.matchAll(lengthPattern)].map((l) =>
      Math.round(parseFloat(l[1]) * (l[2] === 'px' ? 1 : 16)),
    );
    if (prop === 'font-family') {
      const first = value.split(',')[0].trim().replace(/["']/g, '');
      if (first && !/^(inherit|initial|unset|var\()/.test(first))
        add(stats.families, first.toLowerCase());
    } else if (prop === 'font-size') {
      for (const n of px) if (n >= 10 && n <= 96) add(stats.sizes, String(n));
    } else if (/^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(prop)) {
      for (const n of px) if (n >= 2 && n <= 96) add(stats.spacing, String(n));
    } else if (prop.startsWith('border') && prop.endsWith('radius')) {
      for (const n of px) if (n >= 2 && n <= 48) add(stats.radius, String(n));
    }
  }
  return stats;
}

const family = (name: string): Tokens['font.family']['$value'] =>
  /serif|georgia|times|garamond|merriweather|playfair|lora/.test(name) &&
  !/sans/.test(name)
    ? 'Georgia'
    : /verdana/.test(name)
      ? 'Verdana'
      : /arial/.test(name)
        ? 'Arial'
        : 'system-ui';

// Déduit les changements de tokens pour les familles choisies.
export function inspire(
  stats: StyleStats,
  tokens: Tokens,
  wanted: readonly Scope[],
): { key: TokenKey; value: TokenValue }[] {
  const next: Partial<Record<TokenKey, TokenValue>> = {};
  if (wanted.includes('colors')) {
    // Fonds neutres seulement : un bouton coloré n'est pas une surface.
    const backgrounds = ranked(stats.background).filter((c) => hsl(c).s < 0.25);
    const canvas = backgrounds[0];
    if (canvas) {
      next['color.canvas'] = canvas;
      next['color.surface'] =
        backgrounds.find((c) => c !== canvas && contrast(c, canvas) < 1.6) ??
        canvas;
    }
    // Le texte doit rester lisible sur le fond trouvé.
    const texts = ranked(stats.text).filter(
      (t) => !canvas || contrast(t, canvas) >= 2.5,
    );
    const text = texts.find((t) => !canvas || contrast(t, canvas) >= 4.5);
    if (text) next['color.text'] = text;
    const neutral = (c: string) => hsl(c).s < 0.25;
    const muted = texts.find((t) => t !== text && neutral(t));
    if (muted) next['color.muted'] = muted;
    const border = ranked(stats.border).find(
      (b) => b !== text && b !== canvas && neutral(b),
    );
    if (border) next['color.border'] = border;
    const vivid = ranked(stats.all).filter((c) => {
      const { s, l } = hsl(c);
      // #FF0000, #00FF00… viennent souvent d'outils de debug, pas de la marque.
      const pure = /^#(?:00|FF){3}$/.test(c);
      return s > 0.35 && l > 0.2 && l < 0.8 && !pure;
    });
    const brand = vivid[0];
    if (brand) {
      next['color.brand'] = brand;
      next['color.brandHover'] = shade(
        brand,
        hsl(brand).l < 0.3 ? 0.12 : -0.15,
      );
      next['color.onBrand'] =
        contrast(brand, '#FFFFFF') >= contrast(brand, '#000000')
          ? '#FFFFFF'
          : '#000000';
      next['color.focus'] = brand;
    }
    const hue = (from: number, to: number) =>
      vivid.find((c) => {
        const { h } = hsl(c);
        return from <= to ? h >= from && h <= to : h >= from || h <= to;
      });
    const danger = hue(345, 15);
    if (danger && danger !== brand) next['color.danger'] = danger;
    const success = hue(90, 165);
    if (success && success !== brand) next['color.success'] = success;
  }
  if (wanted.includes('typography')) {
    const f = ranked(stats.families)[0];
    if (f) next['font.family'] = family(f);
    const sizes = ranked(stats.sizes).map(Number);
    const body =
      sizes.find((n) => n >= 14 && n <= 18) ??
      sizes.find((n) => n >= 12 && n <= 20);
    if (body) next['font.body'] = body;
    const heading = sizes.find((n) => n >= 22);
    if (heading) next['font.heading'] = heading;
  }
  if (wanted.includes('spacing')) {
    const steps = ranked(stats.spacing)
      .map(Number)
      .slice(0, 3)
      .sort((a, b) => a - b);
    if (steps.length === 3) {
      next['space.sm'] = steps[0];
      next['space.md'] = steps[1];
      next['space.lg'] = steps[2];
    }
  }
  if (wanted.includes('radius')) {
    const r = ranked(stats.radius)[0];
    if (r) next['radius.control'] = Number(r);
  }
  return (Object.entries(next) as [TokenKey, TokenValue][])
    .filter(([key, value]) => tokens[key].$value !== value)
    .map(([key, value]) => ({ key, value }));
}

// Résumé lisible de ce qui a été trouvé, pour l'afficher à côté du diff.
export function summarize(stats: StyleStats) {
  const top = (m: Count, n: number) => ranked(m).slice(0, n);
  return {
    colors: top(stats.all, 10),
    families: top(stats.families, 3),
    sizes: top(stats.sizes, 6).map(Number),
    spacing: top(stats.spacing, 6).map(Number),
    radius: top(stats.radius, 4).map(Number),
  };
}
