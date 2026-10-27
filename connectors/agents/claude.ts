import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentInstruction, parseAgentReply, runCli } from './codex.js';
import type { AgentAdapter, AgentContext } from './types.js';

// shortcut: qualifié sur 2.1.311 ; toute 2.1.x est acceptée car Claude Code se met à jour seul.
// Requalifier les drapeaux ci-dessous à chaque changement de version mineure.
const supportedPrefix = '2.1.';
const cli = { name: 'Claude', check: 'claude auth status' };
// Profil sans outils ni MCP, sans réglages utilisateur/projet (donc sans hooks ni
// plugins personnels), sans session conservée. --bare est exclu : il refuse la
// connexion par abonnement et n'accepte qu'une clé API.
export const claudeArgs = [
  '-p',
  '--output-format',
  'json',
  '--model',
  'claude-sonnet-5-5',
  '--effort',
  'low',
  '--tools',
  '',
  '--strict-mcp-config',
  '--setting-sources',
  '',
  '--no-session-persistence',
  '--disable-slash-commands',
];

export class ClaudeAdapter implements AgentAdapter {
  id = 'claude';
  constructor(private binary = 'claude') {}
  async status() {
    try {
      const version = (
        await runCli(this.binary, ['--version'], '', {}, undefined, 5000, cli)
      ).trim();
      if (!version.startsWith(supportedPrefix))
        return {
          available: false,
          detail: `Version non qualifiée (${version}). DS-Studio attend ${supportedPrefix}x. Mode manuel disponible.`,
        };
      return {
        available: true,
        detail: `Claude Code ${version.split(' ')[0]} détecté · compte et quota vérifiés lors de l'envoi. Contexte transmis au service IA.`,
      };
    } catch {
      return {
        available: false,
        detail: 'CLI Claude absent ou inaccessible. Mode manuel disponible.',
      };
    }
  }
  async reply(message: string, context: AgentContext, signal?: AbortSignal) {
    const status = await this.status();
    if (!status.available) throw new Error(status.detail);
    // Dossier vide : aucun CLAUDE.md ni AGENTS.md du projet n'est découvert.
    const cwd = await mkdtemp(path.join(tmpdir(), 'ds-studio-agent-'));
    // Les identifiants ne sont ni lus ni copiés. USER et LOGNAME permettent seulement
    // au CLI d'ouvrir lui-même le trousseau macOS où il range sa connexion.
    const names = [
      'PATH',
      'HOME',
      'USER',
      'LOGNAME',
      'USERPROFILE',
      'APPDATA',
      'LOCALAPPDATA',
      'SystemRoot',
      'WINDIR',
      'COMSPEC',
      'PATHEXT',
      'TEMP',
      'TMP',
      'TMPDIR',
      'XDG_CONFIG_HOME',
      'XDG_DATA_HOME',
      'CLAUDE_CONFIG_DIR',
      'HTTPS_PROXY',
      'HTTP_PROXY',
      'NO_PROXY',
      'SSL_CERT_FILE',
      'SSL_CERT_DIR',
    ];
    const env = Object.fromEntries(
      names
        .filter((n) => process.env[n] !== undefined)
        .map((n) => [n, process.env[n]!]),
    );
    try {
      const raw = await runCli(
        this.binary,
        claudeArgs,
        agentInstruction(message, context),
        { cwd, env },
        signal,
        120_000,
        cli,
      );
      const result = JSON.parse(raw);
      if (result.is_error || result.subtype !== 'success')
        throw new Error(
          'Échec Claude. Vérifiez votre authentification et votre quota.',
        );
      if (result.num_turns !== 1 || result.permission_denials?.length)
        throw new Error(
          'Le CLI a utilisé un outil inattendu. Intégration refusée.',
        );
      return parseAgentReply(result.result, context.tokens);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
}
