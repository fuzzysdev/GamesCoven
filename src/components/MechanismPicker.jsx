import { MECHANISMS } from '../utils/mechanisms'

export default function MechanismPicker({ selected = [], onChange }) {
  const toggle = (m) => {
    const next = selected.includes(m)
      ? selected.filter(x => x !== m)
      : [...selected, m]
    onChange(next)
  }

  return (
    <div className="mechanism-grid">
      {MECHANISMS.map(m => (
        <button
          key={m}
          type="button"
          className={`mechanism-chip${selected.includes(m) ? ' selected' : ''}`}
          onClick={() => toggle(m)}
        >{m}</button>
      ))}
    </div>
  )
}
