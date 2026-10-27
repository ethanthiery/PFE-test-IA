import type { AgentAdapter } from './types.js';
export const unvalidatedAdapter = (id: 'gemini'): AgentAdapter => ({
  id,
  async status() {
    return {
      available: false,
      detail: `${id} : adaptateur non implémenté, protocole documenté mais non validé.`,
    };
  },
  async reply() {
    throw new Error(
      `${id} non implémenté. Utilisez le mode manuel ou Codex ou Claude qualifiés.`,
    );
  },
});
