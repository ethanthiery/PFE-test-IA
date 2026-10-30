import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  experienceSchema,
  swiftField,
  swiftSources,
} from '../scripts/generate-swift.js';
import { tokensSchema } from '../app/shared/model.js';

const seed = tokensSchema.parse(
  JSON.parse(await readFile('workspace/design-system.tokens.json', 'utf8')),
);
const experience = experienceSchema.parse(
  JSON.parse(await readFile('workspace/mainline.experience.json', 'utf8')),
);

test('noms Swift des tokens', () => {
  assert.equal(swiftField('color.brandHover'), 'brandHover');
  assert.equal(swiftField('font.family'), 'fontFamily');
  assert.equal(swiftField('space.md'), 'spaceMd');
  assert.equal(swiftField('radius.control'), 'radiusControl');
});

test('Swift généré : tokens, haptique et textes échappés', () => {
  const out = swiftSources(seed, {
    haptic: {
      compostage: { $value: 'impact.heavy', $description: 'Composter' },
    },
    copy: {
      arret: {
        $value: 'Dire "stop" \\ sans culpabiliser',
        $description: 'Arrêt',
      },
    },
  });
  assert.match(out.theme, /brand: Color\(hex: 0x3154C4\)/);
  assert.match(out.theme, /radiusControl: \d+\n/);
  assert.match(out.theme, /fontFamily: "system-ui"/);
  assert.match(
    out.experience,
    /static let compostage: SensoryFeedback = \.impact\(weight: \.heavy\)/,
  );
  assert.match(out.experience, /= "Dire \\"stop\\" \\\\ sans culpabiliser"/);
});

test('fichier d’expérience : valeurs et noms contrôlés', () => {
  assert.ok(Object.keys(experience.haptic).length > 0);
  const bad = structuredClone(experience);
  bad.haptic.compostage.$value = 'vibrer-fort' as never;
  assert.equal(experienceSchema.safeParse(bad).success, false);
  assert.equal(
    experienceSchema.safeParse({
      ...experience,
      copy: { 'mon texte': { $value: 'x', $description: '' } },
    }).success,
    false,
  );
});
