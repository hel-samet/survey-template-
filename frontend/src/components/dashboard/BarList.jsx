// Horizontal bars. When `total` is given, widths and percentages are relative to it
// (e.g. share of respondents); otherwise bars are scaled to the largest value.
export default function BarList({ items, total }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="bar-list">
      {items.map((item) => {
        const share = total ? item.value / total : item.value / max;
        return (
          <li key={item.key} className="bar-list__item">
            <div className="bar-list__row">
              <span className="bar-list__label">{item.label}</span>
              <span className="bar-list__value">
                {item.value}
                {total ? <span className="muted"> · {Math.round(share * 100)}%</span> : null}
              </span>
            </div>
            <div className="bar-list__track">
              <div className="bar-list__bar" style={{ width: `${Math.min(100, share * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
