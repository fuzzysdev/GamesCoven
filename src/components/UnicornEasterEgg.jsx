const TRAIL = [
  { color: '#ff6b9d', x: -24,  y: -10 },
  { color: '#ff8c47', x: -48,  y:  16 },
  { color: '#ffe647', x: -72,  y: -20 },
  { color: '#47ff9d', x: -96,  y:  10 },
  { color: '#47d4ff', x: -120, y: -14 },
  { color: '#8847ff', x: -144, y:  20 },
  { color: '#e447ff', x: -168, y:  -6 },
  { color: '#ff47c4', x: -192, y:  12 },
]

const STARS = [
  { glyph: '✨', x: -20,  top: -28 },
  { glyph: '💫', x: -60,  top:  58 },
  { glyph: '⭐', x: -100, top: -32 },
  { glyph: '✨', x: -140, top:  54 },
  { glyph: '🌟', x: -80,  top: -26 },
  { glyph: '💫', x: -160, top:  60 },
]

export default function UnicornEasterEgg({ onDone }) {
  return (
    <div className="unicorn-stage">
      <div className="unicorn-flyer" onAnimationEnd={onDone}>
        <span className="unicorn-emoji">🦄</span>
        {TRAIL.map((s, i) => (
          <span
            key={i}
            className="unicorn-trail-dot"
            style={{
              '--color': s.color,
              '--delay': `${i * 0.07}s`,
              left: s.x + 'px',
              top: `calc(50% + ${s.y}px)`,
            }}
          />
        ))}
        {STARS.map((s, i) => (
          <span
            key={`star-${i}`}
            className="unicorn-star"
            style={{
              '--delay': `${i * 0.18}s`,
              left: s.x + 'px',
              top: s.top + 'px',
            }}
          >
            {s.glyph}
          </span>
        ))}
      </div>
    </div>
  )
}
