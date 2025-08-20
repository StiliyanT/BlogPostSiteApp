import { Children, type PropsWithChildren, type CSSProperties, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { makeStyles, shorthands } from '@fluentui/react-components';

type CarouselProps = {
  ariaLabel?: string;
  // If set, items will be sized to fit this many columns (with the given gap) in the viewport.
  itemsToShow?: number;
  // Gap between items (CSS length). Default '1rem'.
  gap?: string;
  // Auto-advance slides. Default false.
  autoScroll?: boolean;
  // Interval for auto-advance, in ms. Default 5000.
  autoScrollInterval?: number;
  className?: string;
  style?: CSSProperties;
  // Initial real slide index to align to the left on mount (default 0)
  initialIndex?: number;
};

const useStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
  },
  viewport: {
  overflowX: 'hidden',
    display: 'flex',
    ...shorthands.gap('1rem'),
    paddingBottom: '0.5rem',
  // We drive smoothness via JS to better control wrapping
  },
  item: {
    flex: '0 0 auto',
    // Responsive card width; overridden when itemsToShow is provided
    width: 'clamp(260px, 85vw, 360px)',
    '@media (min-width: 768px)': {
      width: 'clamp(260px, 45vw, 360px)',
    },
    '@media (min-width: 1024px)': {
  // Ensure 3 items (with clones) always overflow the viewport to enable looping
  width: 'clamp(260px, 35vw, 380px)',
    },
  },
  // Overlay previous/next controls (vertically centered)
  controlsOverlay: {
    position: 'absolute',
    insetInline: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 3,
    paddingInline: '0.5rem',
  },
  btn: {
    padding: '0.4rem 0.75rem',
    width: '40px',
    height: '40px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: 'rgba(17,17,17,0.6)',
    color: '#ffffff',
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    transition: 'background-color 120ms ease',
    selectors: {
      '&:hover': { backgroundColor: 'rgba(17,17,17,0.8)' },
      '&:focus-visible': { outline: '2px solid #60a5fa', outlineOffset: '2px' },
    },
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(0,0,0,0.65)',
      color: '#ffffff',
    },
    '&[disabled]': { opacity: 0.5, cursor: 'default' },
  },
  fades: {
    position: 'absolute',
    insetBlock: 0,
    insetInlineStart: 0,
    width: '48px',
    pointerEvents: 'none',
    background: 'linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))',
    zIndex: 2,
    '@media (prefers-color-scheme: dark)': {
      background: 'linear-gradient(to right, rgba(23,23,23,1), rgba(23,23,23,0))',
    },
  },
  fadesRight: {
    insetInlineStart: 'auto',
    insetInlineEnd: 0,
    background: 'linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))',
    '@media (prefers-color-scheme: dark)': {
      background: 'linear-gradient(to left, rgba(23,23,23,1), rgba(23,23,23,0))',
    },
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap('0.5rem'),
    marginTop: '0.75rem',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    backgroundColor: '#d1d5db',
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#404040',
    },
    selectors: {
      '&[data-active="true"]': {
        width: '20px',
        backgroundColor: '#111827',
        '@media (prefers-color-scheme: dark)': {
          backgroundColor: '#e5e7eb',
        },
      },
    },
  },
});

export default function Carousel({ children, ariaLabel = 'Carousel', itemsToShow, gap = '1rem', autoScroll = false, autoScrollInterval = 5000, className, style, initialIndex = 0 }: PropsWithChildren<CarouselProps>) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(`carousel-${Math.random().toString(36).slice(2)}`);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // real slide index (0..items.length-1)
  const [currentIndex, setCurrentIndex] = useState(0);
  // visual index within rendered list (with clones when looping)
  const [currentVisual, setCurrentVisual] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const childPositions = useRef<number[]>([]);
  const lastLenRef = useRef<number>(0);
  const animTargetRef = useRef<number | null>(null);
  const [cloneCount, setCloneCount] = useState<number>(1);
  const lastCloneCountRef = useRef<number>(1);
  const scrollEndTimerRef = useRef<any>(null);
  const SCROLL_END_DELAY = 120; // ms after last scroll event to consider settled
  const isClickAnimatingRef = useRef<boolean>(false);
  const clickAnimTimerRef = useRef<any>(null);
  const didInitAlignRef = useRef<boolean>(false);

  // Prepare items and loop clones
  const items = useMemo(() => Children.toArray(children), [children]);
  const loop = items.length > 1;
  const renderItems = useMemo(() => {
    if (!loop) return items;
    const k = Math.max(1, Math.min(cloneCount, items.length));
    const left = items.slice(-k);
    const right = items.slice(0, k);
    return [...left, ...items, ...right];
  }, [items, loop, cloneCount]);

  const updateButtons = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (loop && renderItems.length > 1) {
      setCanPrev(true);
      setCanNext(true);
    } else {
      setCanPrev(scrollLeft > 0);
      setCanNext(scrollLeft + clientWidth < scrollWidth - 1);
    }
    // Do not snap here; only update indices approx. We'll finalize on scroll-settle.
    const positions = childPositions.current;
    if (positions.length) {
      let min = Number.POSITIVE_INFINITY;
      let idx = 0;
      for (let i = 0; i < positions.length; i++) {
        const d = Math.abs(positions[i] - scrollLeft);
        if (d < min) { min = d; idx = i; }
      }
      if (loop) {
        const realLen = items.length;
        const firstReal = cloneCount;
        const lastReal = cloneCount + realLen - 1;
        const clampedIdx = Math.max(0, Math.min(idx, positions.length - 1));
        if (clampedIdx >= firstReal && clampedIdx <= lastReal) {
          setCurrentVisual(clampedIdx);
          setCurrentIndex(clampedIdx - cloneCount);
        }
      } else {
        setCurrentVisual(idx);
        setCurrentIndex(idx);
      }
    }
  };

  const handleScrollSettled = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft } = el;
    const positions = childPositions.current;
    if (!positions.length) return;
    let min = Number.POSITIVE_INFINITY;
    let idx = 0;
    for (let i = 0; i < positions.length; i++) {
      const d = Math.abs(positions[i] - scrollLeft);
      if (d < min) { min = d; idx = i; }
    }
    if (loop) {
      const realLen = items.length;
      const firstReal = cloneCount;
      const lastReal = cloneCount + realLen - 1;
      if (idx < firstReal) {
        const cloneOffset = firstReal - idx;
        const targetReal = realLen - cloneOffset;
        const targetVisual = cloneCount + targetReal;
        const target = positions[targetVisual] ?? 0;
        el.scrollTo({ left: target, behavior: 'auto' });
        setCurrentVisual(targetVisual);
        setCurrentIndex(targetReal);
        animTargetRef.current = null;
        return;
      }
      if (idx > lastReal) {
        const cloneOffset = idx - lastReal - 1;
        const targetReal = cloneOffset;
        const targetVisual = cloneCount + targetReal;
        const target = positions[targetVisual] ?? 0;
        el.scrollTo({ left: target, behavior: 'auto' });
        setCurrentVisual(targetVisual);
        setCurrentIndex(targetReal);
        animTargetRef.current = null;
        return;
      }
      // in real range
      setCurrentVisual(idx);
      setCurrentIndex(idx - cloneCount);
    } else {
      setCurrentVisual(idx);
      setCurrentIndex(idx);
    }
    // release click guard after settle
    if (clickAnimTimerRef.current) {
      clearTimeout(clickAnimTimerRef.current);
      clickAnimTimerRef.current = null;
    }
    isClickAnimatingRef.current = false;
  };

  const getNearestVisualIndex = () => {
    const el = ref.current;
    if (!el) return currentVisual;
    const { scrollLeft } = el;
    const positions = childPositions.current;
    let min = Number.POSITIVE_INFINITY;
    let idx = 0;
    for (let i = 0; i < positions.length; i++) {
      const d = Math.abs(positions[i] - scrollLeft);
      if (d < min) { min = d; idx = i; }
    }
    return idx;
  };

  useEffect(() => {
    // Initialize measurements and listeners (re-run when children change)
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const positions: number[] = [];
      const children = Array.from(el.children) as HTMLElement[];
      for (const ch of children) positions.push(ch.offsetLeft);
      childPositions.current = positions;
    };
    const recalcCloneCount = () => {
      try {
        const firstChild = el.children[0] as HTMLElement | undefined;
        const itemW = firstChild ? firstChild.getBoundingClientRect().width : 0;
        const desired = itemsToShow && itemsToShow > 0 ? Math.min(items.length, itemsToShow) : (itemW > 0 ? Math.max(1, Math.floor(el.clientWidth / itemW)) : 1);
        const k = Math.min(items.length, Math.max(1, desired));
        if (k !== cloneCount) {
          setCloneCount(k);
        }
      } catch {
        // ignore
      }
    };
    const onScroll = () => {
      updateButtons();
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(handleScrollSettled, SCROLL_END_DELAY);
    };
    const onResize = () => {
      measure();
      recalcCloneCount();
      updateButtons();
    };
    // initial measure
    measure();
    recalcCloneCount();
    updateButtons();
    // Determine how many slides are visible to set cloneCount (unless itemsToShow is provided)
    recalcCloneCount();
    // We defer initial alignment until cloneCount is finalized (handled in a layout effect)
    lastLenRef.current = items.length;
    lastCloneCountRef.current = cloneCount;
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
  if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [children, items.length, loop]);

  // After cloneCount is finalized and items are rendered, align to the requested initialIndex exactly once per mount
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!loop) return;
    if (didInitAlignRef.current) return;
    // Determine the desired clone count with current layout
    const computeDesired = () => {
      try {
        const firstChild = el.children[0] as HTMLElement | undefined;
        const itemW = firstChild ? firstChild.getBoundingClientRect().width : 0;
        const desired = itemsToShow && itemsToShow > 0
          ? Math.min(items.length, itemsToShow)
          : (itemW > 0 ? Math.max(1, Math.floor(el.clientWidth / itemW)) : 1);
        return Math.min(items.length, Math.max(1, desired));
      } catch {
        return cloneCount;
      }
    };
    const desiredCloneCount = computeDesired();
    // Wait until clones are rendered with the finalized count
    const expectedChildren = items.length + (desiredCloneCount * 2);
    if (el.children.length !== expectedChildren) return;
    if (cloneCount !== desiredCloneCount) return;
    // Measure current child positions (with the finalized cloneCount)
    const positions: number[] = [];
    const childrenEls = Array.from(el.children) as HTMLElement[];
    for (const ch of childrenEls) positions.push(ch.offsetLeft);
    childPositions.current = positions;
    const len = items.length;
    if (len === 0) return;
    const init = ((initialIndex % len) + len) % len;
    const visualTarget = Math.max(0, Math.min(cloneCount + init, positions.length - 1));
    const target = positions[visualTarget] ?? 0;
    el.scrollTo({ left: target, behavior: 'auto' });
    setCurrentVisual(visualTarget);
    setCurrentIndex(init);
    didInitAlignRef.current = true;
  }, [loop, items.length, cloneCount]);

  const prefersReduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const animateScrollTo = (left: number, duration = 320) => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced || duration <= 0) {
      el.scrollTo({ left, behavior: 'auto' });
      return;
    }
    const start = el.scrollLeft;
    const delta = left - start;
    const startTs = performance.now();
    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    let rafId = 0;
    const step = (ts: number) => {
      const p = Math.min(1, (ts - startTs) / duration);
      el.scrollLeft = start + delta * ease(p);
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        // allow scroll events to fire and debounce to settle
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  };

  const scrollToVisual = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const positions = childPositions.current;
    const i = Math.max(0, Math.min(index, positions.length - 1));
    animTargetRef.current = i;
    animateScrollTo(positions[i] ?? 0);
  };
  const scrollToReal = (realIndex: number) => {
    const len = items.length;
    if (len === 0) return;
    const i = ((realIndex % len) + len) % len; // wrap
    const visual = loop ? i + cloneCount : i;
    scrollToVisual(visual);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); loop ? scrollToVisual(currentVisual + 1) : scrollToReal(currentIndex + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); loop ? scrollToVisual(currentVisual - 1) : scrollToReal(currentIndex - 1); }
  else if (e.key === 'Home') { e.preventDefault(); scrollToReal(0); }
  else if (e.key === 'End') { e.preventDefault(); scrollToReal(items.length - 1); }
  };

  useEffect(() => {
    if (!autoScroll) return;
    let timer: any;
    const tick = () => {
      if (isHovering) return; // pause on hover
      if (loop) {
        scrollToVisual(currentVisual + 1);
      } else {
        const next = currentIndex + 1;
        if (next < items.length) scrollToReal(next);
        else scrollToReal(0);
      }
    };
    timer = setInterval(tick, Math.max(1500, autoScrollInterval));
    return () => clearInterval(timer);
  }, [autoScroll, autoScrollInterval, isHovering, currentIndex, currentVisual, loop, items.length]);

  const computedItemStyle: CSSProperties | undefined = useMemo(() => {
    if (!itemsToShow || itemsToShow <= 0) return undefined;
    // width: (100% - (n - 1) * gap) / n
    return { width: `calc((100% - (${itemsToShow - 1}) * var(--gap, ${gap})) / ${itemsToShow})` } as CSSProperties;
  }, [itemsToShow, gap]);

  return (
    <div
      className={`${styles.root}${className ? ' ' + className : ''}`}
      style={style}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      aria-live="polite"
      onKeyDown={onKeyDown}
    >
      <div className={styles.controlsOverlay} aria-hidden>
        <button
          className={styles.btn}
          onClick={() => {
            if (isClickAnimatingRef.current) return;
            const idx = getNearestVisualIndex();
            isClickAnimatingRef.current = true;
            clickAnimTimerRef.current = setTimeout(() => { isClickAnimatingRef.current = false; }, 300);
            return loop ? scrollToVisual(idx - 1) : scrollToReal(currentIndex - 1);
          }}
          disabled={!loop && !canPrev}
          aria-label="Previous slide"
          aria-controls={idRef.current}
        >
          ‹
        </button>
        <button className={styles.btn} onClick={() => {
          if (isClickAnimatingRef.current) return;
          const idx = getNearestVisualIndex();
          isClickAnimatingRef.current = true;
          clickAnimTimerRef.current = setTimeout(() => { isClickAnimatingRef.current = false; }, 300);
          return loop ? scrollToVisual(idx + 1) : scrollToReal(currentIndex + 1);
        }} disabled={!loop && !canNext} aria-label="Next slide" aria-controls={idRef.current}>
          ›
        </button>
      </div>
      <div
        id={idRef.current}
        className={styles.viewport}
        ref={ref}
        style={{ ['--gap' as any]: gap }}
        tabIndex={0}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {renderItems.map((ch, idx) => (
          <div className={styles.item} key={idx} style={computedItemStyle}>{ch}</div>
        ))}
      </div>
      {/* Edge fades */}
      <div className={styles.fades} aria-hidden />
      <div className={`${styles.fades} ${styles.fadesRight}`} aria-hidden />
    </div>
  );
}
