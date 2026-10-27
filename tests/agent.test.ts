import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodexAdapter,
  parseAgentReply,
  restrictedArgs,
  runCli,
} from '../connectors/agents/codex.js';
import { ClaudeAdapter, claudeArgs } from '../connectors/agents/claude.js';
import { unvalidatedAdapter } from '../connectors/agents/unvalidated.js';
test('CLI réellement absent : erreur exploitable et mode manuel disponible', async () => {
  const adapter = new CodexAdapter('ds-studio-definitely-missing-cli');
  assert.equal((await adapter.status()).available, false);
  await assert.rejects(
    () =>
      runCli('ds-studio-definitely-missing-cli', [], '', {}, undefined, 500),
    /CLI Codex absent/,
  );
});
test('erreur CLI non authentifié simulée, stderr sensible jamais exposé', async () => {
  await assert.rejects(
    () =>
      runCli(
        process.execPath,
        [
          '-e',
          "process.stderr.write('FAKE_PRIVATE_AUTH_DETAIL');process.exit(1)",
        ],
        '',
      ),
    (e) =>
      /Codex indisponible/.test((e as Error).message) &&
      !(e as Error).message.includes('PRIVATE'),
  );
});
test('arrêt interrompt réellement un processus enfant', async () => {
  const c = new AbortController();
  const result = runCli(
    process.execPath,
    ['-e', 'setInterval(()=>{},1000)'],
    '',
    {},
    c.signal,
  );
  c.abort();
  await assert.rejects(() => result, /interrompue/);
});
test('timeout du processus enfant exécuté', async () => {
  await assert.rejects(
    () =>
      runCli(
        process.execPath,
        ['-e', 'setInterval(()=>{},1000)'],
        '',
        {},
        undefined,
        50,
      ),
    /Délai CLI/,
  );
});
test('Gemini indisponible explicitement', async () => {
  const a = unvalidatedAdapter('gemini');
  assert.equal((await a.status()).available, false);
  await assert.rejects(() => a.reply('test', {} as never), /non implémenté/);
});
test('Claude absent : indisponible, erreur nommée, mode manuel conservé', async () => {
  const adapter = new ClaudeAdapter('ds-studio-definitely-missing-cli');
  assert.equal((await adapter.status()).available, false);
  await assert.rejects(
    () => adapter.reply('test', {} as never),
    /CLI Claude absent/,
  );
});
test('profil Claude sans outils, MCP, réglages personnels ni permission automatique', () => {
  const at = (flag: string) => claudeArgs[claudeArgs.indexOf(flag) + 1];
  assert.equal(at('--tools'), '');
  assert.equal(at('--setting-sources'), '');
  assert(claudeArgs.includes('--strict-mcp-config'));
  assert(claudeArgs.includes('--no-session-persistence'));
  assert(
    !claudeArgs.some(
      (a) =>
        a.includes('dangerously') ||
        a.includes('bypass') ||
        a.includes('allowed'),
    ),
  );
});
test('configuration restrictive ne contient aucune permission automatique', () => {
  assert(restrictedArgs.includes('--ignore-user-config'));
  assert(restrictedArgs.includes('read-only'));
  assert(restrictedArgs.includes('mcp_servers={}'));
  assert(
    !restrictedArgs.some(
      (a) => a.includes('dangerously') || a.includes('approve-for-me'),
    ),
  );
});

test('sortie UTF-8 scindée entre buffers conservée', async () => {
  const result = await runCli(
    process.execPath,
    [
      '-e',
      'process.stdout.write(Buffer.from([0xc3]));setTimeout(()=>process.stdout.write(Buffer.from([0xa9])),20)',
    ],
    '',
  );
  assert.equal(result, 'é');
});

test('réponse IA : dimension en texte numérique convertie, le reste intact', () => {
  const tokens = {
    'radius.control': { $type: 'dimension', $value: 10 },
    'color.brand': { $type: 'color', $value: '#181818' },
  } as never;
  const reply = parseAgentReply(
    '{"message":"ok","changes":[{"key":"radius.control","value":"22"},{"key":"color.brand","value":"#111111"}]}',
    tokens,
  );
  assert.deepEqual(reply.changes, [
    { key: 'radius.control', value: 22 },
    { key: 'color.brand', value: '#111111' },
  ]);
  const unit = parseAgentReply(
    '{"message":"ok","changes":[{"key":"radius.control","value":"22px"}]}',
    tokens,
  );
  assert.equal(unit.changes[0].value, '22px');
});
