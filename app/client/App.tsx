import { useEffect, useRef, useState } from 'react';
import {
  BookingCard,
  Button,
  DSProvider,
  ExampleForm,
  Navigation,
  Scenario,
} from './DesignSystem.js';
import {
  ComponentPage,
  FoundationPage,
  Icon,
  IntroPage,
  JournalPage,
  PageHead,
  Showcase,
  type Page,
} from './Docs.js';
import FluidList from './FluidList.js';
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
// Composants Mainline à venir : chaque nom a sa tuile et sa page, vides pour l'instant.
// Renommez, ajoutez ou retirez des entrées ici.
const components: { slug: string; label: string; span: 1 | 2 }[] = [
  { slug: 'bouton', label: 'Bouton', span: 2 },
  { slug: 'billet', label: 'Billet', span: 1 },
  { slug: 'minuteur', label: 'Minuteur', span: 1 },
  { slug: 'carte-trajet', label: 'Carte du trajet', span: 2 },
  { slug: 'onglets', label: 'Onglets', span: 1 },
  { slug: 'interrupteur', label: 'Interrupteur', span: 1 },
  { slug: 'badge', label: 'Badge', span: 1 },
  { slug: 'champ', label: 'Champ de saisie', span: 2 },
  { slug: 'liste', label: 'Liste', span: 1 },
  { slug: 'feuille', label: 'Feuille', span: 1 },
  { slug: 'notification', label: 'Notification', span: 1 },
  { slug: 'carte-postale', label: 'Carte postale', span: 1 },
];
const foundations: {
  slug: string;
  label: string;
  lead: string;
  prefix: string;
}[] = [
  {
    slug: 'couleurs',
    label: 'Couleurs',
    lead: 'Les couleurs sémantiques de Mainline. Choisissez-en une pour proposer une nouvelle valeur.',
    prefix: 'color.',
  },
  {
    slug: 'typographie',
    label: 'Typographie',
    lead: 'La famille et les tailles de texte.',
    prefix: 'font.',
  },
  {
    slug: 'espacements',
    label: 'Espacements',
    lead: 'Les écarts entre les éléments, en pixels.',
    prefix: 'space.',
  },
  {
    slug: 'rayons',
    label: 'Rayons',
    lead: 'Les arrondis des contrôles, en pixels.',
    prefix: 'radius.',
  },
];
// Ordre de lecture du site, pour les flèches précédent / suivant.
const pages: Page[] = [
  { href: '#/', label: 'Vitrine' },
  { href: '#/introduction', label: 'Introduction' },
  { href: '#/journal', label: 'Journal des versions' },
  ...foundations.map((f) => ({
    href: `#/fondations/${f.slug}`,
    label: f.label,
  })),
  ...components.map((c) => ({
    href: `#/composants/${c.slug}`,
    label: c.label,
  })),
  { href: '#/atelier/apercu', label: 'Aperçu des tokens' },
  { href: '#/atelier/assistant', label: 'Assistant' },
];
function useHash() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const update = () => setHash(location.hash || '#/');
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return hash;
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
  const hash = useHash();
  const pageIndex = pages.findIndex((p) => p.href === hash);
  const route = pages[pageIndex] ? hash : '#/';
  const prev = pages[pageIndex - 1];
  const next = pages[pageIndex + 1];
  useEffect(() => {
    scrollTo(0, 0);
    if (route !== '#/') document.getElementById('doc-title')?.focus();
  }, [route]);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    addEventListener('keydown', focusSearch);
    return () => removeEventListener('keydown', focusSearch);
  }, []);
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
      <a
        className="skip-link"
        href="#tokens-panel"
        onClick={(e) => {
          // Pas de changement d'adresse : on reste sur la page en cours.
          e.preventDefault();
          document.getElementById('tokens-panel')?.focus();
        }}
      >
        Aller aux tokens
      </a>
      <div className="shell">
        <aside className="sidebar" aria-label="Navigation du design system">
          <div className="sidebar-search-row">
            <input
              ref={searchInput}
              className="sidebar-search"
              type="search"
              aria-label="Rechercher un token"
              aria-keyshortcuts="Meta+K Control+K"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un token"
            />
            <kbd aria-hidden="true">⌘K</kbd>
          </div>
          {/* Visible seulement pendant un filtre, comme sur la référence ; lu par les lecteurs d'écran. */}
          <p className={search ? 'sidebar-hint' : 'sr-only'} role="status">
            {matchingKeys.length} résultat(s).{' '}
            {search && 'La sélection courante reste accessible.'}
          </p>
          <nav aria-label="Design system">
            <FluidList className="sidebar-group">
              <a
                href="#/"
                data-fluid
                aria-current={route === '#/' ? 'page' : undefined}
              >
                Vitrine
              </a>
              <a
                href="#/introduction"
                data-fluid
                aria-current={route === '#/introduction' ? 'page' : undefined}
              >
                Introduction
              </a>
              <a
                href="#/journal"
                data-fluid
                aria-current={route === '#/journal' ? 'page' : undefined}
              >
                Journal des versions
                {state.history.length > 0 && <span className="new-dot" />}
              </a>
            </FluidList>
            <div className="sidebar-title">
              Fondations <span>{foundations.length}</span>
            </div>
            <FluidList className="sidebar-group">
              {foundations.map((f) => (
                <a
                  key={f.slug}
                  href={`#/fondations/${f.slug}`}
                  data-fluid
                  aria-current={
                    route === `#/fondations/${f.slug}` ? 'page' : undefined
                  }
                >
                  {f.label}
                </a>
              ))}
            </FluidList>
            <div className="sidebar-title">
              Composants <span>{components.length}</span>
            </div>
            <FluidList className="sidebar-group">
              {components.map((c) => (
                <a
                  key={c.slug}
                  href={`#/composants/${c.slug}`}
                  data-fluid
                  aria-current={
                    route === `#/composants/${c.slug}` ? 'page' : undefined
                  }
                >
                  {c.label}
                </a>
              ))}
            </FluidList>
            <div className="sidebar-title">
              Atelier <span>2</span>
            </div>
            <FluidList className="sidebar-group">
              <a
                href="#/atelier/apercu"
                data-fluid
                aria-current={route === '#/atelier/apercu' ? 'page' : undefined}
              >
                Aperçu des tokens
              </a>
              <a
                href="#/atelier/assistant"
                data-fluid
                aria-current={
                  route === '#/atelier/assistant' ? 'page' : undefined
                }
              >
                Assistant
              </a>
            </FluidList>
          </nav>
          <div className="sidebar-foot">
            <span className="local-badge">● Local · V2</span>
            <span>{boot?.figma.label ?? 'Figma non connecté'}</span>
          </div>
        </aside>
        <main className="content">
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
          {route === '#/' && (
            <>
              <header className="content-head reveal-in">
                <div className="doc-head-row">
                  <h1>Mainline</h1>
                  <nav className="doc-arrows" aria-label="Pages voisines">
                    <span aria-hidden="true">
                      <Icon d="M19 12H5m0 0 6-6m-6 6 6 6" size={16} />
                    </span>
                    <a
                      href="#/introduction"
                      aria-label="Suivant : Introduction"
                    >
                      <Icon d="M5 12h14m0 0-6-6m6 6-6 6" size={16} />
                    </a>
                  </nav>
                </div>
                <p>Le design system de Mainline : Focus Journey.</p>
                <div className="intro-actions">
                  <button
                    className="studio-primary"
                    onClick={() => void perform(exportTokens)}
                  >
                    <Icon d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
                    Exporter les tokens
                  </button>
                  <label className="file-button">
                    <Icon d="M12 21V9m0 0-4 4m4-4 4 4M5 3h14" />
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
                  <a className="ghost-link" href="#/introduction">
                    Lire l’introduction
                  </a>
                </div>
              </header>
              <h2 id="ds-title" className="sr-only" tabIndex={-1}>
                Composants
              </h2>
              <Showcase components={components} />
            </>
          )}
          {route === '#/introduction' && <IntroPage prev={prev} next={next} />}
          {route === '#/journal' && (
            <JournalPage
              history={state.history}
              prev={prev}
              next={next}
              onUndo={(id) =>
                void perform(async () =>
                  setProposal(
                    await request('undo', { revision: state.revision, id }),
                  ),
                )
              }
            />
          )}
          {foundations.map(
            (f) =>
              route === `#/fondations/${f.slug}` && (
                <FoundationPage
                  key={f.slug}
                  title={f.label}
                  lead={f.lead}
                  keys={tokenKeys.filter((k) => k.startsWith(f.prefix))}
                  tokens={state.tokens}
                  selected={key}
                  onSelect={setKey}
                  prev={prev}
                  next={next}
                />
              ),
          )}
          {components.map(
            (c) =>
              route === `#/composants/${c.slug}` && (
                <ComponentPage
                  key={c.slug}
                  label={c.label}
                  prev={prev}
                  next={next}
                />
              ),
          )}
          {route === '#/atelier/apercu' && (
            <article className="doc-page doc-page-wide">
              <PageHead
                title="Aperçu des tokens"
                lead="Vos tokens appliqués aux composants d’exemple Lisière, ici et dans un écran réel. Ils seront remplacés par ceux de Mainline."
                prev={prev}
                next={next}
              />
              <section
                className="ds-panel doc-section"
                aria-labelledby="ds-catalogue"
              >
                <h2 id="ds-catalogue">Design System</h2>
                <DSProvider tokens={state.tokens}>
                  <div className="catalogue-grid">
                    <div className="button-row">
                      <Button>Action principale</Button>
                      <Button variant="secondary">Secondaire</Button>
                      <Button variant="danger">Supprimer</Button>
                      <Button disabled>Indisponible</Button>
                    </div>
                    <BookingCard />
                    <ExampleForm />
                    <Navigation />
                  </div>
                </DSProvider>
              </section>
              <section className="doc-section">
                <h2 id="mobile-title">Aperçu responsive</h2>
                <p>{devices[device].width} px CSS · aucun zoom appliqué</p>
                <div className="tile-body">
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
              </section>
            </article>
          )}
          {route === '#/atelier/assistant' && (
            <article className="doc-page">
              <PageHead
                title="Assistant"
                lead="Demandez une proposition de tokens. Rien n’est appliqué sans votre validation."
                prev={prev}
                next={next}
              />
              <div className="agent-panel">
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
                    <option value="codex">Codex · expérimental qualifié</option>
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
                      privé, DESIGN_RULES.md et 10 messages récents. Aucun outil
                      ni commande ; propositions seulement.
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
            </article>
          )}
        </main>
        <aside
          id="tokens-panel"
          tabIndex={-1}
          className="customizer"
          aria-label="Personnaliser les tokens"
        >
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
            {state.tokens[key].$type === 'color' && (
              <label className="color-picker">
                Couleur
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
            <button
              className="studio-primary"
              disabled={!boot || draft === String(current)}
            >
              Proposer
            </button>
          </form>
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
            Mainline · révision {state.revision} · conçu par Ethan Thiery
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
