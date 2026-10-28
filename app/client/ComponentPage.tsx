import { useState } from 'react';

type Link = { slug: string; label: string } | undefined;

// Page de documentation d'un composant, sur le modèle des pages « docs » de la
// référence. Les emplacements sont volontairement vides : à remplir avec vos composants.
export default function ComponentPage({
  label,
  prev,
  next,
}: {
  label: string;
  prev: Link;
  next: Link;
}) {
  return (
    <article className="doc-page" aria-labelledby="doc-title">
      <header className="doc-head">
        <div>
          <h1 id="doc-title" tabIndex={-1}>
            {label}
          </h1>
          <p className="doc-slot" aria-label="Description à venir" />
        </div>
        <nav className="doc-arrows" aria-label="Composants voisins">
          <PageArrow to={prev} dir="prev" />
          <PageArrow to={next} dir="next" />
        </nav>
      </header>
      <section className="doc-section doc-install">
        <div>
          <h2>Installation</h2>
          <p className="doc-slot" aria-label="Instructions à venir" />
        </div>
        <button className="studio-primary" disabled>
          Copier le prompt
        </button>
      </section>
      <section className="doc-section">
        <h2>Aperçu</h2>
        <p className="doc-slot" aria-label="Explication à venir" />
        <PreviewFrame />
      </section>
      <section className="doc-section">
        <h2>Variantes</h2>
        <p className="doc-slot" aria-label="Explication à venir" />
        <PreviewFrame />
      </section>
      <section className="doc-section doc-usage">
        <div>
          <h3>À utiliser quand</h3>
          <ul className="doc-slot" aria-label="Cas d’usage à venir" />
        </div>
        <div>
          <h3>À éviter quand</h3>
          <ul className="doc-slot" aria-label="Contre-indications à venir" />
        </div>
      </section>
    </article>
  );
}

function PageArrow({ to, dir }: { to: Link; dir: 'prev' | 'next' }) {
  const name = dir === 'prev' ? 'Composant précédent' : 'Composant suivant';
  const d =
    dir === 'prev' ? 'M19 12H5m0 0 6-6m-6 6 6 6' : 'M5 12h14m0 0-6-6m6 6-6 6';
  const icon = (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
  return to ? (
    <a href={`#/composants/${to.slug}`} aria-label={`${name} : ${to.label}`}>
      {icon}
    </a>
  ) : (
    <span aria-hidden="true">{icon}</span>
  );
}

// Cadre « Aperçu / Code » vide, prêt à recevoir une démo et son code.
function PreviewFrame() {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  return (
    <div className="doc-frame">
      <div className="doc-frame-bar" role="tablist" aria-label="Affichage">
        {(['preview', 'code'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === 'preview' ? 'Aperçu' : 'Code'}
          </button>
        ))}
      </div>
      <div
        className="doc-frame-body"
        role="tabpanel"
        aria-label={tab === 'preview' ? 'Aperçu à venir' : 'Code à venir'}
      />
    </div>
  );
}
