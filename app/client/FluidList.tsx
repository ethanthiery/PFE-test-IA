import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

type Box = { x: number; y: number; w: number; h: number };
const boxOf = (el: Element, root: Element): Box => {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
};
const style = (box: Box | undefined): CSSProperties =>
  box
    ? {
        transform: `translate(${box.x}px, ${box.y}px)`,
        width: box.w,
        height: box.h,
        opacity: 1,
      }
    : { opacity: 0 };

// Liste à survol fluide : un seul fond glisse d'élément en élément sous le pointeur,
// et un second marque l'élément actif. Les éléments survolables portent data-fluid.
// Le fond actif suit [aria-current], [aria-selected=true] ou [aria-pressed=true].
export default function FluidList({
  className = '',
  children,
  ...rest
}: {
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Box>();
  const [active, setActive] = useState<Box>();
  const moved = useRef(false);
  useLayoutEffect(() => {
    const el = root.current?.querySelector(
      '[data-fluid][aria-current="page"], [data-fluid][aria-selected="true"], [data-fluid][aria-pressed="true"]',
    );
    const next = el && root.current ? boxOf(el, root.current) : undefined;
    // Sans dépendances : se recale après chaque rendu, mais ne relance un rendu que si la position change.
    setActive((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  });
  return (
    <div
      ref={root}
      className={`fluid-list ${className}`}
      onPointerMove={(e) => {
        const item = (e.target as Element).closest('[data-fluid]');
        if (!item || !root.current?.contains(item)) return;
        const next = boxOf(item, root.current);
        if (hover && next.x === hover.x && next.y === hover.y) return;
        // Première entrée : le fond apparaît sur place, sans glisser depuis l'ancienne position.
        root.current.dataset.entering = moved.current ? '' : 'true';
        moved.current = true;
        setHover(next);
      }}
      onPointerLeave={() => {
        moved.current = false;
        setHover(undefined);
      }}
      {...rest}
    >
      <span aria-hidden="true" className="fluid-active" style={style(active)} />
      <span aria-hidden="true" className="fluid-hover" style={style(hover)} />
      {children}
    </div>
  );
}
