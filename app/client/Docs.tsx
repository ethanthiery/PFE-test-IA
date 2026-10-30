import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import FluidList from './FluidList.js';
import {
  cssVar,
  swiftField,
  type Revision,
  type TokenKey,
  type Tokens,
} from '../shared/model.js';

export type Page = { href: string; label: string };

// Icône au trait, comme celles de la référence (Lucide, 1,5 px).
export const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

// Ajoute data-revealed quand l'élément entre à l'écran ; l'animation est en CSS.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.revealed = 'true';
            io.unobserve(e.target);
          }
      },
      { rootMargin: '0px 0px -8px 0px' },
    );
    el.querySelectorAll('.reveal').forEach((r) => io.observe(r));
    return () => io.disconnect();
  });
  return ref;
}

// En-tête de page : titre, sous-titre, flèches vers les pages voisines.
export function PageHead({
  title,
  lead,
  prev,
  next,
  children,
}: {
  title: string;
  lead?: string;
  prev?: Page;
  next?: Page;
  children?: ReactNode;
}) {
  return (
    <header className="doc-head reveal-in">
      <div className="doc-head-row">
        <h1 id="doc-title" tabIndex={-1}>
          {title}
        </h1>
        <nav className="doc-arrows" aria-label="Pages voisines">
          <Arrow to={prev} dir="prev" />
          <Arrow to={next} dir="next" />
        </nav>
      </div>
      {lead ? <p>{lead}</p> : <p className="doc-slot" />}
      {children && <div className="intro-actions">{children}</div>}
    </header>
  );
}

function Arrow({ to, dir }: { to?: Page; dir: 'prev' | 'next' }) {
  const d =
    dir === 'prev' ? 'M19 12H5m0 0 6-6m-6 6 6 6' : 'M5 12h14m0 0-6-6m6 6-6 6';
  const name = dir === 'prev' ? 'Précédent' : 'Suivant';
  return to ? (
    <a href={to.href} aria-label={`${name} : ${to.label}`}>
      <Icon d={d} size={16} />
    </a>
  ) : (
    <span aria-hidden="true">
      <Icon d={d} size={16} />
    </span>
  );
}

// Vitrine : une tuile par composant. Les zones de démonstration sont vides
// tant que les composants Mainline n'existent pas.
export function Showcase({
  components,
}: {
  components: { slug: string; label: string; span: 1 | 2 }[];
}) {
  const grid = useReveal<HTMLDivElement>();
  return (
    <div className="bento" ref={grid}>
      {components.map((c, i) => (
        <a
          key={c.slug}
          href={`#/composants/${c.slug}`}
          className={`tile reveal span-${c.span}`}
          style={{ '--i': i % 3 } as CSSProperties}
        >
          <span className="tile-demo" aria-hidden="true" />
          <span className="tile-caption">{c.label}</span>
        </a>
      ))}
    </div>
  );
}

export function IntroPage({ prev, next }: { prev?: Page; next?: Page }) {
  return (
    <article className="doc-page">
      <PageHead
        title="Introduction"
        lead="Pourquoi les composants de Mainline se comportent comme ils le font."
        prev={prev}
        next={next}
      />
      <section className="doc-section">
        <h2>Un voyage, pas un minuteur</h2>
        <p>
          Mainline transforme une session de travail en trajet en train. Chaque
          composant sert ce rituel : choisir, composter, travailler, faire une
          pause en gare, arriver.
        </p>
      </section>
      <section className="doc-section">
        <h2>Jamais culpabilisant</h2>
        <p>
          Arrêter une session ou prolonger une pause n’utilise ni couleur
          d’erreur ni message punitif. L’erreur est réservée aux vrais
          problèmes.
        </p>
      </section>
      <section className="doc-section">
        <h2>Le rituel avant le décor</h2>
        <p>
          Billet, compostage et arrivée ont des états distincts et lisibles. Le
          thème ferroviaire habille la fonction, il ne la remplace pas.
        </p>
      </section>
      <section className="doc-section">
        <h2>Liquid Glass</h2>
        <p>
          L’application iPhone s’appuie sur les composants Liquid Glass d’Apple.
          Les tokens de ce site en fixent les teintes, les arrondis et les
          espacements.
        </p>
      </section>
      <section className="doc-section">
        <h2>Une offre honnête</h2>
        <p>
          L’écran payant se ferme toujours, sans compte à rebours ni prix barré
          fictif.
        </p>
      </section>
    </article>
  );
}

export function JournalPage({
  history,
  onUndo,
  prev,
  next,
}: {
  history: Revision[];
  onUndo: (id: string) => void;
  prev?: Page;
  next?: Page;
}) {
  return (
    <article className="doc-page">
      <PageHead
        title="Journal des versions"
        lead="Chaque changement de token validé, du plus récent au plus ancien. Annuler une révision n’efface pas les autres."
        prev={prev}
        next={next}
      />
      {!history.length && <p className="muted">Aucune révision enregistrée.</p>}
      <ol className="journal">
        {[...history].reverse().map((event) => (
          <li key={event.id} className="doc-section">
            <div className="journal-head">
              <h2>Révision {event.revision}</h2>
              <time>{new Date(event.date).toLocaleString('fr-FR')}</time>
            </div>
            <p>Source : {event.source}</p>
            <ul>
              {event.patches.map((p) => (
                <li key={p.key}>
                  <code>{p.key}</code> : <del>{p.before}</del> →{' '}
                  <ins>{p.after}</ins>
                </li>
              ))}
            </ul>
            <button onClick={() => onUndo(event.id)}>
              Annuler la révision {event.revision}
            </button>
          </li>
        ))}
      </ol>
    </article>
  );
}

// Fondations : les tokens d'une famille, lus en direct. Un clic sélectionne le
// token dans le panneau de droite pour proposer une nouvelle valeur.
export function FoundationPage({
  title,
  lead,
  keys,
  tokens,
  selected,
  onSelect,
  prev,
  next,
}: {
  title: string;
  lead: string;
  keys: TokenKey[];
  tokens: Tokens;
  selected: TokenKey;
  onSelect: (k: TokenKey) => void;
  prev?: Page;
  next?: Page;
}) {
  const [lang, setLang] = useState<'swift' | 'css'>('swift');
  const [copied, setCopied] = useState('');
  const snippet = (k: TokenKey) =>
    lang === 'swift' ? `theme.${swiftField(k)}` : `var(${cssVar(k)})`;
  async function copy(k: TokenKey) {
    try {
      await navigator.clipboard.writeText(snippet(k));
      setCopied(k);
      setTimeout(() => setCopied((c) => (c === k ? '' : c)), 1500);
    } catch {
      setCopied('');
    }
  }
  return (
    <article className="doc-page">
      <PageHead title={title} lead={lead} prev={prev} next={next} />
      <div className="token-toolbar">
        <span>Copier le code en</span>
        <FluidList className="doc-tabs" role="tablist" aria-label="Langage">
          {(['swift', 'css'] as const).map((l) => (
            <button
              key={l}
              role="tab"
              data-fluid
              aria-selected={lang === l}
              onClick={() => setLang(l)}
            >
              {l === 'swift' ? 'SwiftUI' : 'CSS'}
            </button>
          ))}
        </FluidList>
        <span className="sr-only" role="status">
          {copied && `${snippet(copied as TokenKey)} copié.`}
        </span>
      </div>
      <FluidList className="token-table" role="list">
        {keys.map((k) => {
          const t = tokens[k];
          return (
            <div key={k} role="listitem" className="token-row">
              <button
                data-fluid
                aria-pressed={selected === k}
                aria-label={`Sélectionner ${k}`}
                onClick={() => onSelect(k)}
              >
                <span className="token-preview" aria-hidden="true">
                  {t.$type === 'color' ? (
                    <span style={{ background: String(t.$value) }} />
                  ) : k.startsWith('radius') ? (
                    <span style={{ borderRadius: Number(t.$value) }} />
                  ) : k.startsWith('space') ? (
                    <span style={{ width: Number(t.$value) }} />
                  ) : (
                    <b
                      style={{
                        fontFamily: String(tokens['font.family'].$value),
                        fontSize:
                          t.$type === 'dimension' ? Number(t.$value) : 16,
                      }}
                    >
                      Aa
                    </b>
                  )}
                </span>
                <span className="token-name">{k}</span>
                <span className="token-value">
                  {String(t.$value)}
                  {t.$type === 'dimension' ? ' px' : ''}
                </span>
              </button>
              <button
                type="button"
                className="token-copy"
                aria-label={`Copier ${snippet(k)}`}
                onClick={() => void copy(k)}
              >
                {copied === k ? 'Copié' : <code>{snippet(k)}</code>}
              </button>
            </div>
          );
        })}
      </FluidList>
    </article>
  );
}

// Expérience : retours haptiques et textes du rituel, lus dans
// workspace/mainline.experience.json et livrés dans le package Swift.
export function ExperiencePage({
  experience,
  prev,
  next,
}: {
  experience: Record<
    'haptic' | 'copy',
    Record<string, { $value: string; $description: string }>
  >;
  prev?: Page;
  next?: Page;
}) {
  const groups = [
    { id: 'haptic', title: 'Retours haptiques', swift: 'MainlineHaptic' },
    { id: 'copy', title: 'Textes', swift: 'MainlineCopy' },
  ] as const;
  return (
    <article className="doc-page">
      <PageHead
        title="Expérience"
        lead="Les retours haptiques et les textes qui rythment le trajet. Ils se modifient dans workspace/mainline.experience.json, puis npm run swift les livre au package MainlineDS."
        prev={prev}
        next={next}
      />
      {groups.map((g) => (
        <section className="doc-section" key={g.id}>
          <h2>{g.title}</h2>
          <ul className="experience-list">
            {Object.entries(experience[g.id]).map(([name, e]) => (
              <li key={name}>
                <code>
                  {g.swift}.{name}
                </code>
                <span>{e.$description}</span>
                <strong>{e.$value}</strong>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

// Page d'un composant : la structure des pages « docs » de la référence,
// avec des emplacements vides à remplir quand le composant existera.
export function ComponentPage({
  label,
  prev,
  next,
}: {
  label: string;
  prev?: Page;
  next?: Page;
}) {
  return (
    <article className="doc-page">
      <PageHead title={label} prev={prev} next={next} />
      <section className="doc-section doc-install">
        <div>
          <h2>Installation</h2>
          <p className="doc-slot" />
        </div>
        <button className="studio-primary" disabled>
          <Icon d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M5 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2" />
          Copier le prompt
        </button>
      </section>
      <section className="doc-section">
        <h2>Aperçu</h2>
        <p className="doc-slot" />
        <PreviewFrame />
      </section>
      <section className="doc-section">
        <h2>Variantes</h2>
        <p className="doc-slot" />
        <PreviewFrame />
      </section>
      <section className="doc-section doc-usage">
        <div>
          <h2>À utiliser quand</h2>
          <ul className="doc-slot" />
        </div>
        <div>
          <h2>À éviter quand</h2>
          <ul className="doc-slot" />
        </div>
      </section>
    </article>
  );
}

// Cadre « Aperçu / Code » avec interrupteur « Inspecter », vide pour l'instant.
function PreviewFrame() {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [inspect, setInspect] = useState(false);
  return (
    <div className="doc-frame">
      <div className="doc-frame-bar">
        <FluidList className="doc-tabs" role="tablist" aria-label="Affichage">
          {(['preview', 'code'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              data-fluid
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'preview' ? 'Aperçu' : 'Code'}
            </button>
          ))}
        </FluidList>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={inspect}
            onChange={(e) => setInspect(e.target.checked)}
          />
          <span aria-hidden="true" />
          Inspecter
        </label>
      </div>
      <div className="doc-frame-body" role="tabpanel" />
    </div>
  );
}
