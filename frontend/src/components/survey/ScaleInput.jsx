import { useLanguage } from '../../hooks/useLanguage.js';
import { range } from '../../questionTypes.js';

// Linear scale, e.g. 0–10 with "Not likely" / "Very likely" labels at each end.
export default function ScaleInput({ name, min = 1, max = 5, minLabel, maxLabel, value, onChange }) {
  const { tl } = useLanguage();
  const points = range(min, max);

  return (
    <div className="scale">
      <div className="scale__points" role="radiogroup" style={{ '--points': points.length }}>
        {points.map((point) => (
          <label key={point} className={`scale__point ${value === point ? 'is-on' : ''}`}>
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={point}
              checked={value === point}
              onChange={() => onChange(point)}
            />
            {point}
          </label>
        ))}
      </div>
      {(tl(minLabel) || tl(maxLabel)) && (
        <div className="scale__labels">
          <span>{tl(minLabel)}</span>
          <span>{tl(maxLabel)}</span>
        </div>
      )}
    </div>
  );
}
