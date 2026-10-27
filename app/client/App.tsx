import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookingCard,
  Button,
  DSProvider,
  ExampleForm,
  Navigation,
  Scenario,
} from './DesignSystem.js';
import ProjectBrief from './ProjectBrief.js';
import { useTokenDraft } from './useTokenDraft.js';
import {
  bootstrap,
  commit,
  exportTokens,
  getState,
  request,
  type Bootstrap,
} from './api.js';
import {
  contrast,
  tokenKeys,
  type Proposal,
  type State,
  type TokenKey,
} from '../shared/model.js';

const devices = [
  { label: 'Compact · 320', width: 320 },
  { label: 'Standard · 375', width: 375 },
  { label: 'Grand · 430', width: 430 },
  { label: 'Desktop · 1024', width: 1024 },
];
const components = [
  ['comp-button', 'Button'],
  ['comp-card', 'BookingCard'],
  ['comp-form', 'ExampleForm'],
  ['comp-nav', 'Navigation'],
  ['comp-preview', 'Aperçu responsive'],
  ['comp-agent', 'Assistant'],
] as const;
// Une tuile de la galerie : zone de démonstration et légende, sur 1 à 3 colonnes.
function Tile({
  id,
  label,
  span = 1,
  children,
}: {
  id: string;
  label: string;
  span?: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <figure id={id} className={`tile span-${span}`}>
      <div className="tile-demo">{children}</div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
function useDesignState() {
  const [state, setState] = useState<State>();
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || !live) return;
      inFlight = true;
      try {
        const s = await getState();
        if (live) {
          setState((current) =>
            !current || s.revision >= current.revision ? s : current,
          );
          setError('');
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1200);
    const channel = new BroadcastChannel('ds-studio');
    channel.onmessage = refresh;
    return () => {
      live = false;
      clearInterval(timer);
      channel.close();
    };
  }, []);
  return { state, setState, error };
}
function announceChange() {
  const c = new BroadcastChannel('ds-studio');
  c.postMessage('updated');
  c.close();
}
export function Preview() {
  const { state, error } = useDesignState();
  const scenario =
    new URLSearchParams(location.search).get('scenario') ?? 'cards';
  return state ? (
    <Scenario tokens={state.tokens} scenario={scenario} />
  ) : (
    <p role="alert">{error || 'Chargement du scénario…'}</p>
  );
}
export default function App() {
  const { state, setState, error: stateError } = useDesignState();
  const [boot, setBoot] = useState<Bootstrap>();
  const [key, setKey] = useState<TokenKey>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('ds-studio-token-draft-v2') || 'null',
      );
      if (tokenKeys.includes(saved?.key)) return saved.key;
    } catch {
      /* Facultatif. */
    }
    return 'color.brand';
  });
  const { draft, setDraft, recovered, discard } = useTokenDraft(
    key,
    state?.tokens[key].$value,
  );
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<Bootstrap['agents']>([]);
  const [proposal, setProposal] = useState<Proposal>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [device, setDevice] = useState(1);
  const [scenario, setScenario] = useState('cards');
  const [agent, setAgent] = useState('manual');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bootstrap()
      .then(setBoot)
      .catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (agent !== 'manual')
      request<Bootstrap['agents']>('agents')
        .then(setAgents)
        .catch((e) => setError(e.message));
  }, [agent]);
  const current = state?.tokens[key].$value;

  useEffect(() => {
    if (proposal) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    } else dialog.current?.close();
  }, [proposal]);
  const clearError = () => {
    setError('');
    setNotice('');
  };
  async function perform(action: () => Promise<void>) {
    clearError();
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function proposeToken() {
    if (!state) return;
    await perform(async () => {
      const token = state.tokens[key];
      const value = token.$type === 'dimension' ? Number(draft) : draft;
      setProposal(
        await request<Proposal>('proposals', {
          revision: state.revision,
          changes: [{ key, value }],
        }),
      );
    });
  }
  async function accept() {
    if (!proposal) return;
    setSaving(true);
    await perform(async () => {
      const next = await commit(proposal);
      try {
        sessionStorage.removeItem('ds-studio-token-draft-v2');
      } catch {
        /* Facultatif. */
      }
      setState(next);
      setProposal(undefined);
      announceChange();
      setNotice(`Révision ${next.revision} enregistrée sur disque.`);
    });
    setSaving(false);
  }
  async function sendMessage() {
    if (!state || !message.trim() || thinking) return;
    const text = message;
    setMessage('');
    setThinking(true);
    clearError();
    const previous = chat.slice(-10);
    setChat([...chat, { role: 'user', text }]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await request<{
        message: string;
        proposal: Proposal | null;
      }>(
        'agent',
        { agent, message: text, revision: state.revision, history: previous },
        abort.signal,
      );
      setChat((c) => [...c, { role: 'assistant', text: result.message }]);
      if (result.proposal) setProposal(result.proposal);
    } catch (e) {
      setError(
        abort.signal.aborted
          ? 'Demande interrompue. Aucun changement accepté.'
          : (e as Error).message,
      );
    } finally {
      setThinking(false);
      controller.current = null;
    }
  }
  if (!state)
    return (
      <main className="loading">
        <h1>DS-Studio</h1>
        <p role="alert">{stateError || 'Ouverture du Design System…'}</p>
        <p>Lancez le serveur local puis rechargez cette page.</p>
      </main>
    );
  const selectedAgent = agents.find((a) => a.id === agent);
  const agentName = agent === 'claude' ? 'Claude' : 'Codex';
  const staleProposal = !!proposal && proposal.revision !== state.revision;
  const draftContrast =
    /^#[0-9a-fA-F]{6}$/.test(draft) &&
    (key === 'color.brand' || key === 'color.onBrand')
      ? contrast(
          key === 'color.brand' ? draft : state.tokens['color.brand'].$value,
          key === 'color.onBrand'
            ? draft
            : state.tokens['color.onBrand'].$value,
        )
      : undefined;
  const matchingKeys = tokenKeys.filter((k) =>
    k.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <a className="skip-link" href="#ds-title">
        Aller aux tokens
      </a>
      <div className="shell">
        <aside className="sidebar" aria-label="Navigation de l’atelier">
          <div className="sidebar-brand">
            <span className="brand-symbol">ds.</span>
            <strong>DS-Studio</strong>
          </div>
          <input
            className="sidebar-search"
            type="search"
            aria-label="Rechercher un token"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un token"
          />
          <p className="sidebar-hint" role="status">
            {matchingKeys.length} résultat(s).{' '}
            {search && 'La sélection courante reste accessible.'}
          </p>
          <nav className="sidebar-group" aria-label="Sections">
            <a href="#ds-title">Galerie</a>
            <a href="#agent-title">Assistant</a>
            <a href="#mobile-title">Aperçu responsive</a>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              aria-expanded={historyOpen}
            >
              Historique · {state.revision}
            </button>
          </nav>
          <div className="sidebar-group">
            <div className="sidebar-title">
              Tokens <span>{matchingKeys.length}</span>
            </div>
            {matchingKeys.map((k) => (
              <button
                key={k}
                className="sidebar-token"
                aria-label={`Sélectionner ${k}`}
                aria-pressed={key === k}
                onClick={() => setKey(k)}
              >
                {state.tokens[k].$type === 'color' && (
                  <span
                    className="dot"
                    style={{ background: String(state.tokens[k].$value) }}
                  />
                )}
                {k}
              </button>
            ))}
          </div>
          <div className="sidebar-group">
            <div className="sidebar-title">
              Composants <span>{components.length}</span>
            </div>
            {components.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </div>
          <div className="sidebar-foot">
            <span className="local-badge">● Local · V2</span>
            <span>{boot?.figma.label ?? 'Figma non connecté'}</span>
          </div>
        </aside>
        <main className="content">
          <header className="content-head">
            <h1>Une source. Toutes les vues.</h1>
            <p>
              Explorez, proposez, validez. Construisez ensuite votre propre
              outil.
            </p>
            <div className="intro-actions">
              <button
                className="studio-primary"
                onClick={() => void perform(exportTokens)}
              >
                Exporter les tokens
              </button>
              <label className="file-button">
                Importer un JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file)
                      void perform(async () => {
                        if (file.size > 128000)
                          throw new Error(
                            'Fichier trop volumineux (128 Ko maximum).',
                          );
                        const tokens = JSON.parse(await file.text());
                        setProposal(
                          await request('import', {
                            revision: state.revision,
                            tokens,
                          }),
                        );
                      });
                  }}
                />
              </label>
            </div>
          </header>
          <div className="feedback" aria-live="polite">
            {(error || stateError) && (
              <p className="error" role="alert">
                {error || stateError}
              </p>
            )}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
          </div>
          {historyOpen && (
            <section
              className="history"
              aria-label="Historique des changements"
            >
              <h2>Un historique, pas un écrasement.</h2>
              <p>
                Annulez un changement précis. Les autres tokens restent intacts.
                Une annulation s’enregistre elle aussi.
              </p>
              {!state.history.length && <p>Aucun changement enregistré.</p>}
              <ol>
                {[...state.history].reverse().map((event) => (
                  <li key={event.id}>
                    <div>
                      <strong>Révision {event.revision}</strong> ·{' '}
                      {event.source} ·{' '}
                      <time>
                        {new Date(event.date).toLocaleString('fr-FR')}
                      </time>
                      <p>{event.patches.map((p) => p.key).join(', ')}</p>
                    </div>
                    <button
                      onClick={() =>
                        void perform(async () =>
                          setProposal(
                            await request('undo', {
                              revision: state.revision,
                              id: event.id,
                            }),
                          ),
                        )
                      }
                    >
                      Annuler la révision {event.revision}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="ds-panel" aria-labelledby="ds-title">
            <h2 id="ds-title" className="sr-only" tabIndex={-1}>
              Design System
            </h2>
            {/* Chaque tuile accueille un composant : remplacez-les par les vôtres. */}
            <div className="bento">
              <Tile id="comp-button" label="Button" span={2}>
                <DSProvider tokens={state.tokens}>
                  <div className="button-row">
                    <Button>Action principale</Button>
                    <Button variant="secondary">Secondaire</Button>
                    <Button variant="danger">Supprimer</Button>
                    <Button disabled>Indisponible</Button>
                  </div>
                </DSProvider>
              </Tile>
              <Tile id="comp-card" label="BookingCard">
                <DSProvider tokens={state.tokens}>
                  <BookingCard />
                </DSProvider>
              </Tile>
              <Tile id="comp-form" label="ExampleForm">
                <DSProvider tokens={state.tokens}>
                  <ExampleForm />
                </DSProvider>
              </Tile>
              <Tile id="comp-nav" label="Navigation" span={2}>
                <DSProvider tokens={state.tokens}>
                  <Navigation />
                </DSProvider>
              </Tile>
              <Tile
                id="comp-preview"
                label={`Aperçu responsive · ${devices[device].width} px CSS, aucun zoom`}
                span={3}
              >
                <div className="tile-body">
                  <h2 id="mobile-title" className="sr-only" tabIndex={-1}>
                    Aperçu responsive
                  </h2>
                  <div className="preview-controls">
                    <label className="field">
                      Viewport
                      <select
                        value={device}
                        onChange={(e) => setDevice(Number(e.target.value))}
                      >
                        {devices.map((d, i) => (
                          <option key={d.width} value={i}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Scénario
                      <select
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                      >
                        <option value="cards">Découvrir</option>
                        <option value="form">Inscription</option>
                      </select>
                    </label>
                  </div>
                  <div className="viewport-scroll">
                    <iframe
                      title="Aperçu responsive"
                      src={`/?preview=1&scenario=${scenario}`}
                      width={devices[device].width}
                      height={760}
                    />
                  </div>
                </div>
              </Tile>
              <Tile
                id="comp-agent"
                label="Assistant · contexte PFE et tokens autorisés"
                span={3}
              >
                <div className="tile-body agent-panel">
                  <h2 id="agent-title" className="sr-only" tabIndex={-1}>
                    Contexte et assistant
                  </h2>
                  <ProjectBrief />
                  <label className="field">
                    Mode de travail
                    <select
                      value={agent}
                      onChange={(e) => setAgent(e.target.value)}
                    >
                      <option value="manual">Manuel · sans compte IA</option>
                      <option value="codex">
                        Codex · expérimental qualifié
                      </option>
                      <option value="claude">Claude Code · expérimental</option>
                      <option value="gemini" disabled>
                        Gemini CLI · non implémenté
                      </option>
                    </select>
                  </label>
                  {agent === 'manual' ? (
                    <div className="agent-empty">
                      <div className="line-icon">✳</div>
                      <h3>Le Design System vous appartient.</h3>
                      <p>
                        Aucun compte nécessaire. Sélectionnez un token dans le
                        panneau central, modifiez sa valeur et examinez le diff
                        avant de l’appliquer.
                      </p>
                      <ol>
                        <li>Choisissez une couleur.</li>
                        <li>Proposez un changement.</li>
                        <li>Validez et observez les deux vues.</li>
                      </ol>
                      <p className="privacy-note">
                        Les changements restent sur votre machine. Figma et l’IA
                        sont facultatifs.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="privacy-note">
                        {selectedAgent?.detail ?? 'Détection du CLI…'}
                      </p>
                      <p className="privacy-note">
                        Envoi à {agentName} : tokens, workspace/PFE.md, brief
                        privé, DESIGN_RULES.md et 10 messages récents. Aucun
                        outil ni commande ; propositions seulement.
                      </p>
                      <div
                        className="chat-log"
                        aria-label="Conversation"
                        aria-live="polite"
                      >
                        {chat.map((c, i) => (
                          <article className={`chat-message ${c.role}`} key={i}>
                            <strong>
                              {c.role === 'user' ? 'Vous' : agentName}
                            </strong>
                            <p>{c.text}</p>
                          </article>
                        ))}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void sendMessage();
                        }}
                      >
                        <label className="field">
                          Votre demande
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={8000}
                            placeholder="Propose une couleur de marque plus chaleureuse."
                            disabled={thinking}
                          />
                        </label>
                        <button
                          className="studio-primary"
                          disabled={
                            thinking ||
                            !message.trim() ||
                            !selectedAgent?.available
                          }
                        >
                          {thinking
                            ? 'Réflexion en cours…'
                            : `Envoyer à ${agentName}`}
                        </button>
                        {thinking && (
                          <button
                            type="button"
                            onClick={() => controller.current?.abort()}
                          >
                            Arrêter
                          </button>
                        )}
                      </form>
                    </>
                  )}
                </div>
              </Tile>
            </div>
          </section>
        </main>
        <aside className="customizer" aria-label="Personnaliser les tokens">
          <div className="editor-title">
            <h3>Tokens sémantiques</h3>
            <span>{tokenKeys.length} tokens</span>
          </div>
          <form
            className="token-form"
            onSubmit={(e) => {
              e.preventDefault();
              void proposeToken();
            }}
          >
            <label className="field">
              Token
              <select
                value={key}
                onChange={(e) => setKey(e.target.value as TokenKey)}
              >
                {[...new Set([key, ...matchingKeys])].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Valeur
              {state.tokens[key].$type === 'fontFamily' ? (
                <select
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  {['system-ui', 'Arial', 'Georgia', 'Verdana'].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label="Valeur du token"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                  type={
                    state.tokens[key].$type === 'dimension' ? 'number' : 'text'
                  }
                  min={state.tokens[key].$type === 'dimension' ? 0 : undefined}
                  max={
                    state.tokens[key].$type === 'dimension' ? 128 : undefined
                  }
                  step={
                    state.tokens[key].$type === 'dimension' ? 'any' : undefined
                  }
                  maxLength={20}
                />
              )}
            </label>
            <button
              className="studio-primary"
              disabled={!boot || draft === String(current)}
            >
              Proposer
            </button>
          </form>
          {state.tokens[key].$type === 'color' && (
            <label className="color-picker">
              Choisir visuellement
              <input
                aria-label="Sélecteur de couleur"
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(draft) ? draft : String(current)
                }
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
          )}
          {draft !== String(current) && (
            <p className="draft-status" role="status">
              {recovered
                ? 'Brouillon récupéré dans cet onglet.'
                : 'Brouillon non enregistré.'}{' '}
              Rien n’est appliqué.
              <button type="button" onClick={discard}>
                Abandonner le brouillon
              </button>
            </p>
          )}
          <p className="token-hint">
            {state.tokens[key].$type === 'color'
              ? '#RRGGBB · '
              : state.tokens[key].$type === 'dimension'
                ? 'Pixels, de 0 à 128 · '
                : ''}
            Rien n’est écrit avant validation.
          </p>
          <p className="contrast" aria-live="polite">
            Marque / texte sur marque :{' '}
            <strong>
              {contrast(
                state.tokens['color.brand'].$value,
                state.tokens['color.onBrand'].$value,
              ).toFixed(2)}
              :1
            </strong>{' '}
            ·{' '}
            {contrast(
              state.tokens['color.brand'].$value,
              state.tokens['color.onBrand'].$value,
            ) >= 4.5
              ? 'AA texte courant'
              : 'Contraste à améliorer'}
          </p>
          {draftContrast !== undefined && draft !== String(current) && (
            <p className="contrast" role="status">
              Contraste proposé : <strong>{draftContrast.toFixed(2)}:1</strong>{' '}
              ·{' '}
              {draftContrast >= 4.5
                ? 'AA texte courant'
                : 'Contraste à améliorer'}
              . Cette indication ne certifie pas tous les états du composant.
            </p>
          )}
          <p className="customizer-foot">
            Lisière · exemple fictif, sources locales · r{state.revision}
          </p>
        </aside>
      </div>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (saving) e.preventDefault();
          else setProposal(undefined);
        }}
        aria-labelledby="diff-title"
      >
        <h2 id="diff-title">Valider le changement</h2>
        <p>
          Proposition {proposal?.source} · basée sur la révision{' '}
          {proposal?.revision}. Ces valeurs seront enregistrées sur votre
          machine.
        </p>
        {staleProposal && (
          <p role="alert" className="error">
            Une autre validation a modifié le DS. Fermez ce diff et refaites
            votre proposition ; aucun écrasement n’est permis.
          </p>
        )}
        <div className="diff-scroll">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Avant</th>
                <th>Après</th>
              </tr>
            </thead>
            <tbody>
              {proposal?.patches.map((p) => (
                <tr key={p.key}>
                  <th>{p.key}</th>
                  <td>
                    <del>{p.before}</del>
                  </td>
                  <td>
                    <ins>{p.after}</ins>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            ref={cancelButton}
            onClick={() => setProposal(undefined)}
            disabled={saving}
          >
            Ne pas appliquer
          </button>
          <button
            className="studio-primary"
            onClick={() => void accept()}
            disabled={saving || staleProposal}
          >
            {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
          </button>
        </div>
      </dialog>
    </>
  );
}
