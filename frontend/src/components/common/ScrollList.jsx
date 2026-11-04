import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from './Icon.jsx';

// A card list that shows `visible` rows and scrolls through the rest, with ▲ ▼ arrow buttons.
// The height is measured from the real rows, so rows of any height fit exactly.
// Render prop: children({ listProps, arrows }) — spread listProps on the <ul>/<ol> (merge its className),
// and place `arrows` wherever the card wants them, usually in its header.
export default function ScrollList({ visible, count, children }) {
  const { t } = useLanguage();
  const listRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(null);
  const [edges, setEdges] = useState({ top: true, bottom: true, hidden: 0 });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = list.children;
    if (rows.length <= visible) {
      setMaxHeight(null);
      return;
    }
    const first = rows[0];
    const last = rows[visible - 1];
    setMaxHeight(last.offsetTop + last.offsetHeight - first.offsetTop);
  }, [visible]);

  const updateEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const top = list.scrollTop <= 1;
    const bottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    // Rows lying entirely below the visible area.
    const limit = list.scrollTop + list.clientHeight;
    const hidden = [...list.children].filter((row) => row.offsetTop - list.offsetTop >= limit - 1).length;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom && prev.hidden === hidden ? prev : { top, bottom, hidden }));
  }, []);

  // Re-measure whenever the rows change (every live refresh) and when the window resizes.
  useLayoutEffect(() => {
    measure();
  }, [measure, count, children]);
  useLayoutEffect(() => {
    updateEdges();
  }, [updateEdges, maxHeight, count, children]);
  useEffect(() => {
    const onResize = () => {
      measure();
      updateEdges();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, updateEdges]);

  const scrollByPage = (direction) => {
    const list = listRef.current;
    if (!list) return;
    const rowHeight = list.children[0]?.offsetHeight || 48;
    // One row short of a page, so the last row stays in view for context.
    const step = Math.max(rowHeight, list.clientHeight - rowHeight);
    list.scrollBy({ top: direction * step, behavior: 'smooth' });
  };

  const scrollable = maxHeight !== null;
  const arrows = scrollable ? (
    <div className="scroll-arrows">
      {edges.hidden > 0 && <span className="scroll-arrows__more">{t('live.more', { count: edges.hidden })}</span>}
      <button
        type="button"
        className="scroll-arrows__btn"
        onClick={() => scrollByPage(-1)}
        disabled={edges.top}
        aria-label={t('live.scrollUp')}
        title={t('live.scrollUp')}
      >
        <Icon name="up" size={15} />
      </button>
      <button
        type="button"
        className="scroll-arrows__btn"
        onClick={() => scrollByPage(1)}
        disabled={edges.bottom}
        aria-label={t('live.scrollDown')}
        title={t('live.scrollDown')}
      >
        <Icon name="down" size={15} />
      </button>
    </div>
  ) : null;

  return children({
    arrows,
    listProps: {
      ref: listRef,
      onScroll: updateEdges,
      className: scrollable ? `scroll-list is-scrollable ${edges.bottom ? 'is-end' : ''}` : 'scroll-list',
      style: scrollable ? { maxHeight } : undefined,
      tabIndex: scrollable ? 0 : undefined,
    },
  });
}
