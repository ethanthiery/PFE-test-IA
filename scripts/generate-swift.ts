// Génère le code Swift du package MainlineDS à partir des tokens validés et de
// workspace/mainline.experience.json. Usage : npm run swift
import { get } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { tokensSchema, type Tokens } from '../app/shared/model.js';

// Retours haptiques SwiftUI (SensoryFeedback) autorisés dans le fichier d'expérience.
const haptics = {
  selection: '.selection',
  success: '.success',
  warning: '.warning',
  error: '.error',
  start: '.start',
  stop: '.stop',
  increase: '.increase',
  decrease: '.decrease',
  levelChange: '.levelChange',
  'impact.light': '.impact(weight: .light)',
  'impact.medium': '.impact(weight: .medium)',
  'impact.heavy': '.impact(weight: .heavy)',
  'impact.soft': '.impact(flexibility: .soft)',
  'impact.rigid': '.impact(flexibility: .rigid)',
} as const;
const camel = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]*$/, 'Nom attendu : camelCase');
const entry = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ $value: value, $description: z.string().max(200) }).strict();
export const experienceSchema = z
  .object({
    haptic: z.record(
      camel,
      entry(z.enum(Object.keys(haptics) as [keyof typeof haptics])),
    ),
    copy: z.record(camel, entry(z.string().min(1).max(200))),
  })
  .strict();
export type Experience = z.infer<typeof experienceSchema>;

// Champ Swift de MainlineTheme : color.brandHover → brandHover, space.md → spaceMd.
export const swiftField = (key: string) => {
  const [group, name] = key.split('.');
  return group === 'color'
    ? name
    : group + name[0].toUpperCase() + name.slice(1);
};
const swiftString = (s: string) =>
  '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const header =
  '// Généré par `npm run swift` depuis DS-Studio. Ne pas modifier à la main.\n';

export function swiftSources(tokens: Tokens, experience: Experience) {
  const args = Object.entries(tokens).map(([key, t]) => {
    const value =
      t.$type === 'color'
        ? `Color(hex: 0x${t.$value.slice(1).toUpperCase()})`
        : t.$type === 'dimension'
          ? String(t.$value)
          : swiftString(t.$value);
    return `        ${swiftField(key)}: ${value}`;
  });
  const theme = `${header}import SwiftUI

extension MainlineTheme {
    /// Les valeurs validées dans DS-Studio au moment de la génération.
    public static let standard = MainlineTheme(
${args.join(',\n')}
    )
}
`;
  const doc = (d: string) => `    /// ${d}\n`;
  const list = (group: Record<string, { $description: string }>) =>
    Object.entries(group)
      .map(
        ([k, e]) =>
          `        (${swiftString(k)}, ${swiftString(e.$description)}, ${k}),`,
      )
      .join('\n');
  const exp = `${header}import SwiftUI

/// Retours haptiques du rituel Mainline.
public enum MainlineHaptic {
${Object.entries(experience.haptic)
  .map(
    ([k, h]) =>
      doc(h.$description) +
      `    public static let ${k}: SensoryFeedback = ${haptics[h.$value]}`,
  )
  .join('\n')}
    /// Tous les retours, pour une page de démonstration.
    public static let all: [(name: String, description: String, feedback: SensoryFeedback)] = [
${list(experience.haptic)}
    ]
}

/// Textes clés de Mainline, au ton jamais culpabilisant.
public enum MainlineCopy {
${Object.entries(experience.copy)
  .map(
    ([k, c]) =>
      doc(c.$description) +
      `    public static let ${k} = ${swiftString(c.$value)}`,
  )
  .join('\n')}
    /// Tous les textes, pour une page de démonstration.
    public static let all: [(name: String, description: String, text: String)] = [
${list(experience.copy)}
    ]
}
`;
  return { theme, experience: exp };
}

// Les tokens viennent de l'app ouverte ; sinon du dernier export.
function liveTokens(port = 4310): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = get(
      {
        host: '127.0.0.1',
        port,
        path: '/api/state',
        headers: { host: `127.0.0.1:${port}` },
        timeout: 2000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).tokens);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Délai dépassé')));
    req.on('error', reject);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let raw: unknown;
  try {
    raw = await liveTokens();
    console.log('Tokens lus dans DS-Studio (http://127.0.0.1:4310).');
  } catch {
    raw = JSON.parse(
      await readFile(path.join(root, 'workspace/mainline.tokens.json'), 'utf8'),
    );
    console.log(
      'DS-Studio fermé : tokens lus dans workspace/mainline.tokens.json.',
    );
  }
  const tokens = tokensSchema.parse(raw);
  const experience = experienceSchema.parse(
    JSON.parse(
      await readFile(
        path.join(root, 'workspace/mainline.experience.json'),
        'utf8',
      ),
    ),
  );
  const out = path.join(root, 'ios/MainlineDS/Sources/MainlineDS');
  const files = swiftSources(tokens, experience);
  await writeFile(
    path.join(out, 'Theme+Standard.generated.swift'),
    files.theme,
  );
  await writeFile(
    path.join(out, 'Experience.generated.swift'),
    files.experience,
  );
  console.log(`Swift généré dans ${path.relative(root, out)}.`);
}
