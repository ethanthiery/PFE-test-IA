import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  analyzeCss,
  inspire,
  toHex,
} from '../connectors/inspiration/analyze.js';
import { checkUrl, isPrivateAddress } from '../connectors/inspiration/fetch.js';
import { tokensSchema } from '../app/shared/model.js';

const seed = tokensSchema.parse(
  JSON.parse(await readFile('workspace/design-system.tokens.json', 'utf8')),
);
const css = `
:root { --accent: #ff5a1f; --bg: rgb(250, 250, 250); }
body { background: var(--bg); color: #171717; font-family: "Inter", sans-serif; font-size: 15px; }
p { color: #737373; font-size: 15px; margin: 0 0 12px; }
.card { background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; }
.btn { background: var(--accent); color: white; border-radius: 12px; padding: 8px 12px; gap: 8px; }
.btn:hover { background: #ff5a1f; }
.ghost { background: rgba(0, 0, 0, 0.04); }
h1 { font-size: 2rem; margin-bottom: 24px; }
section { padding: 24px 12px; gap: 8px; background: var(--bg); }
`;

test('couleurs CSS normalisées', () => {
  assert.equal(toHex('#fff'), '#FFFFFF');
  assert.equal(toHex('rgb(255 90 31)'), '#FF5A1F');
  assert.equal(toHex('hsl(0, 100%, 50%)'), '#FF0000');
  assert.equal(toHex('rgba(0,0,0,0.04)'), null);
  assert.equal(toHex('#00000010'), null);
});

test('style déduit : couleurs, typographie, espacements, rayon', () => {
  // Une valeur déjà identique n'est pas proposée : on lit la valeur finale.
  const changes = Object.fromEntries(
    inspire(analyzeCss(css), seed, [
      'colors',
      'typography',
      'spacing',
      'radius',
    ]).map((c) => [c.key, c.value]),
  );
  const got = (k: string) => changes[k] ?? seed[k as keyof typeof seed].$value;
  assert.equal(got('color.canvas'), '#FAFAFA');
  assert.equal(got('color.surface'), '#FFFFFF');
  assert.equal(got('color.text'), '#171717');
  assert.equal(got('color.brand'), '#FF5A1F');
  assert.equal(got('font.family'), 'system-ui');
  assert.equal(got('font.body'), 15);
  assert.equal(got('font.heading'), 32);
  assert.deepEqual(
    [got('space.sm'), got('space.md'), got('space.lg')],
    [8, 12, 24],
  );
  assert.equal(got('radius.control'), 12);
});

test('seules les familles demandées changent', () => {
  const keys = inspire(analyzeCss(css), seed, ['spacing']).map((c) => c.key);
  assert.ok(keys.length > 0);
  assert.ok(keys.every((k) => k.startsWith('space.')));
});

test('liens et adresses refusés avant tout téléchargement', () => {
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.1',
    '192.168.0.5',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fd00::1',
  ])
    assert.equal(isPrivateAddress(ip), true, ip);
  assert.equal(isPrivateAddress('93.184.216.34'), false);
  for (const url of [
    'ftp://a.com',
    'http://' + 'user:pw@a.com',
    'http://localhost:3000',
    'http://10.0.0.1',
    'pas un lien',
  ])
    assert.throws(() => checkUrl(url), url);
  assert.equal(checkUrl('https://example.com/a').host, 'example.com');
});

test('le thème sombre du site est ignoré', () => {
  const stats = analyzeCss(`
    body { background: #ffffff; color: #111111; }
    .dark body { background: #000000; color: #fafafa; }
    .dark .a, .dark .b, .dark .c { background: #000000; color: #fafafa; }
    @media (prefers-color-scheme: dark) { body { background: #0a0a0a; } }
  `);
  assert.deepEqual([...stats.background.keys()], ['#FFFFFF']);
  assert.deepEqual([...stats.text.keys()], ['#111111']);
});
