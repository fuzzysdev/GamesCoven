import { useState } from 'react'
import { IconX, IconCheck, IconPencil, IconSearch, IconExternalLink, IconPlus } from '@tabler/icons-react'
import MechanismPicker from './MechanismPicker'
import { TypeTag, StarRow, GameIcon } from './GameCard'
import { TYPES, GAME_EMOJI } from '../utils/constants'
import { searchBGG, fetchBGGGame } from '../utils/bgg'

function EmojiPicker({ selected, onSelect }) {
  return (
    <div className="emoji-picker-wrap">
      <div className="emoji-grid">
        {GAME_EMOJI.map(e => (
          <button key={e} type="button" className={`emoji-btn${selected === e ? ' selected' : ''}`} onClick={() => onSelect(e)}>{e}</button>
        ))}
      </div>
    </div>
  )
}

export function BGGSearch({ gameName, onApply }) {
  const [query, setQuery] = useState(gameName || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const doSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError('')
    setOpen(false)
    try {
      const res = await searchBGG(q)
      setResults(res)
      setOpen(true)
      if (res.length === 0) setError('No results found on BGG.')
    } catch {
      setError('Could not reach BoardGameGeek — check your connection and try again.')
    }
    setSearching(false)
  }

  const select = async (result) => {
    setOpen(false)
    setLoadingId(result.id)
    setError('')
    try {
      const details = await fetchBGGGame(result.id)
      onApply({ name: result.name, ...details })
    } catch {
      setError(`Got the game but couldn't load its image. Try again.`)
      onApply({ name: result.name, bggId: result.id, bggUrl: `https://boardgamegeek.com/boardgame/${result.id}` })
    }
    setLoadingId(null)
  }

  return (
    <div className="field">
      <label className="label">
        find on BoardGameGeek
        <span style={{ color: 'var(--g-muted)', fontWeight: 400, marginLeft: 6 }}>— auto-fills image &amp; player info</span>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="search BGG by name..."
        />
        <button className="btn teal" type="button" onClick={doSearch} disabled={searching || !query.trim()} style={{ whiteSpace: 'nowrap' }}>
          {searching ? '…' : <><IconSearch size={13} /> Find</>}
        </button>
      </div>
      {loadingId && <div style={{ fontSize: 12, color: 'var(--g-muted)', marginTop: 5 }}>loading game details…</div>}
      {error && <div className="error-msg" style={{ marginTop: 5 }}>{error}</div>}
      {open && results.length > 0 && (
        <div className="bgg-results">
          {results.map(r => (
            <div key={r.id} className="bgg-result" onClick={() => select(r)}>
              <span>{r.name}</span>
              {r.year && <span style={{ color: 'var(--g-muted)', fontSize: 11, flexShrink: 0 }}>{r.year}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GameFormFields({
  name, setName, type, setType, emoji, setEmoji,
  minP, setMinP, maxP, setMaxP, time, setTime,
  boughtDate, setBoughtDate, mechanisms, setMechanisms,
  bggImageUrl, onClearBGGImage, isAdd, isNew, setIsNew,
}) {
  return (
    <>
      {bggImageUrl && (
        <div className="bgg-applied">
          <img src={bggImageUrl} alt="BGG cover" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>Using BGG box art</div>
            <div style={{ color: 'var(--g-muted)', fontSize: 11 }}>emoji picker is the fallback if this is cleared</div>
          </div>
          <button className="btn ghost" type="button" onClick={onClearBGGImage} style={{ fontSize: 11, padding: '3px 8px' }}>clear</button>
        </div>
      )}
      <div className="field">
        <label className="label">game name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gloom" autoFocus={isAdd && !name} />
      </div>
      <div className="row2">
        <div className="field">
          <label className="label">type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">emoji icon {bggImageUrl && <span style={{ color: 'var(--g-muted)', fontWeight: 400 }}>(fallback)</span>}</label>
          <input className="input" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ fontSize: 20 }} />
        </div>
      </div>
      {!bggImageUrl && (
        <div className="field">
          <label className="label">icon</label>
          <EmojiPicker selected={emoji} onSelect={setEmoji} />
        </div>
      )}
      <div className="row2">
        <div className="field">
          <label className="label">min players</label>
          <input className="input" type="number" min={1} max={10} value={minP} onChange={e => setMinP(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">max players</label>
          <input className="input" type="number" min={1} max={20} value={maxP} onChange={e => setMaxP(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label">estimated time (minutes)</label>
        <input className="input" type="number" min={10} max={360} value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">date purchased</label>
        <input className="input" type="date" value={boughtDate} onChange={e => setBoughtDate(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">mechanisms <span style={{ color: 'var(--g-muted)', fontWeight: 400 }}>(select all that apply)</span></label>
        <MechanismPicker selected={mechanisms} onChange={setMechanisms} />
      </div>
      <label className="player-check" style={{ marginTop: 2 }}>
        <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} />
        <span>mark as <span style={{ color: 'var(--g-pink)' }}>new</span> <span style={{ color: 'var(--g-muted)', fontSize: 12 }}>(shows the New ribbon)</span></span>
      </label>
    </>
  )
}

function useBGGForm(initial = {}) {
  const [name, setName] = useState(initial.name || '')
  const [type, setType] = useState(initial.type || 'strategy')
  const [emoji, setEmoji] = useState(initial.emoji || '🎲')
  const [minP, setMinP] = useState(initial.minPlayers ?? 2)
  const [maxP, setMaxP] = useState(initial.maxPlayers ?? 4)
  const [time, setTime] = useState(initial.timeEst ?? 60)
  const [boughtDate, setBoughtDate] = useState(initial.boughtDate || new Date().toISOString().slice(0, 10))
  const [mechanisms, setMechanisms] = useState(initial.mechanisms || [])
  const [isNew, setIsNew] = useState(initial.isNew ?? true)
  const [bggImageUrl, setBggImageUrl] = useState(initial.bggImageUrl || '')
  const [bggId, setBggId] = useState(initial.bggId || '')
  const [bggUrl, setBggUrl] = useState(initial.bggUrl || '')
  const [busy, setBusy] = useState(false)

  const applyBGG = (data) => {
    if (data.name) setName(data.name)
    if (data.minPlayers) setMinP(data.minPlayers)
    if (data.maxPlayers) setMaxP(data.maxPlayers)
    if (data.timeEst) setTime(data.timeEst)
    if (data.bggImageUrl) setBggImageUrl(data.bggImageUrl)
    if (data.bggId) setBggId(data.bggId)
    if (data.bggUrl) setBggUrl(data.bggUrl)
  }

  const clearBGG = () => { setBggImageUrl(''); setBggId(''); setBggUrl('') }

  const fields = { name, setName, type, setType, emoji, setEmoji, minP, setMinP, maxP, setMaxP, time, setTime, boughtDate, setBoughtDate, mechanisms, setMechanisms, isNew, setIsNew, bggImageUrl, bggId, bggUrl, busy, setBusy }

  return { ...fields, applyBGG, clearBGG, nameVal: name, typeVal: type }
}

export function AddGameModal({ onClose, onSave, baseGame = null }) {
  const f = useBGGForm({ isNew: true })

  const save = async () => {
    if (!f.name.trim()) return
    f.setBusy(true)
    await onSave({
      name: f.name.trim(), type: f.type, emoji: f.emoji || '🎲',
      minPlayers: +f.minP, maxPlayers: +f.maxP, timeEst: +f.time,
      boughtDate: f.boughtDate, mechanisms: f.mechanisms, isNew: f.isNew,
      ...(f.bggImageUrl && { bggImageUrl: f.bggImageUrl }),
      ...(f.bggId && { bggId: f.bggId }),
      ...(f.bggUrl && { bggUrl: f.bggUrl }),
      ...(baseGame && { baseGameId: baseGame.id }),
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        {baseGame ? (
          <>
            <div className="modal-title">🧩 add expansion</div>
            <div className="expansion-banner">expanding: <strong>{baseGame.name}</strong></div>
          </>
        ) : (
          <div className="modal-title">🎲 add a game to your grimoire</div>
        )}
        <BGGSearch gameName={f.name} onApply={f.applyBGG} />
        <GameFormFields
          name={f.name} setName={f.setName} type={f.type} setType={f.setType}
          emoji={f.emoji} setEmoji={f.setEmoji} minP={f.minP} setMinP={f.setMinP}
          maxP={f.maxP} setMaxP={f.setMaxP} time={f.time} setTime={f.setTime}
          boughtDate={f.boughtDate} setBoughtDate={f.setBoughtDate}
          mechanisms={f.mechanisms} setMechanisms={f.setMechanisms}
          bggImageUrl={f.bggImageUrl} onClearBGGImage={f.clearBGG}
          isNew={f.isNew} setIsNew={f.setIsNew} isAdd
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={f.busy || !f.name.trim()}>
            <IconCheck size={14} /> add game
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditGameModal({ game, onClose, onSave }) {
  const f = useBGGForm({ ...game, isNew: game.isNew ?? false })

  const save = async () => {
    if (!f.name.trim()) return
    f.setBusy(true)
    await onSave(game.id, {
      name: f.name.trim(), type: f.type, emoji: f.emoji || '🎲',
      minPlayers: +f.minP, maxPlayers: +f.maxP, timeEst: +f.time,
      boughtDate: f.boughtDate, mechanisms: f.mechanisms, isNew: f.isNew,
      bggImageUrl: f.bggImageUrl || '', bggId: f.bggId || '', bggUrl: f.bggUrl || '',
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title"><IconPencil size={16} /> edit {game.name}</div>
        <BGGSearch gameName={f.name} onApply={f.applyBGG} />
        <GameFormFields
          name={f.name} setName={f.setName} type={f.type} setType={f.setType}
          emoji={f.emoji} setEmoji={f.setEmoji} minP={f.minP} setMinP={f.setMinP}
          maxP={f.maxP} setMaxP={f.setMaxP} time={f.time} setTime={f.setTime}
          boughtDate={f.boughtDate} setBoughtDate={f.setBoughtDate}
          mechanisms={f.mechanisms} setMechanisms={f.setMechanisms}
          bggImageUrl={f.bggImageUrl} onClearBGGImage={f.clearBGG}
          isNew={f.isNew} setIsNew={f.setIsNew}
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={f.busy || !f.name.trim()}>
            <IconCheck size={14} /> save changes
          </button>
        </div>
      </div>
    </div>
  )
}

export function GameDetailModal({ game, playLog, onClose, onLogPlay, onEdit }) {
  if (!game) return null
  const gameLogs = playLog.filter(l => l.gameId === game.id)
  const allRatings = gameLogs.flatMap(l => l.players.map(p => p.rating))
  const avgRating = allRatings.length
    ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
    : null
  const sorted = [...gameLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const lastPlayed = sorted[0]

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ marginBottom: 10 }}><GameIcon game={game} large /></div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {game.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 }}>
            <TypeTag type={game.type} />
            {game.isNew && <span className="meta-chip" style={{ color: 'var(--g-pink)', borderColor: 'rgba(255,126,199,0.35)' }}>✨ new</span>}
            {game.baseGameId && <span className="meta-chip">🧩 expansion</span>}
            <span className="meta-chip">👥 {game.minPlayers}–{game.maxPlayers}p</span>
            <span className="meta-chip">⏱ ~{game.timeEst}m</span>
          </div>
          {game.bggUrl && (
            <a href={game.bggUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--g-teal)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconExternalLink size={11} /> View on BoardGameGeek
            </a>
          )}
        </div>
        {game.mechanisms?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="mechanism-grid">
              {game.mechanisms.map(m => <span key={m} className="mechanism-chip selected">{m}</span>)}
            </div>
          </div>
        )}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value" style={{ color: 'var(--g-purple)' }}>{gameLogs.length}</div>
            <div className="stat-label">sessions</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: 'var(--g-amber)' }}>{avgRating || '—'}</div>
            <div className="stat-label">avg rating</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: 'var(--g-teal)', fontSize: 13 }}>
              {lastPlayed ? lastPlayed.date.slice(0, 7) : 'never'}
            </div>
            <div className="stat-label">last played</div>
          </div>
        </div>
        {sorted.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--g-muted)', marginBottom: 8 }}>recent sessions</div>
            {sorted.slice(0, 3).map(s => (
              <div key={s.id} className="session-mini">
                <span>{s.date}</span>
                <span style={{ color: 'var(--g-muted)' }}>{s.players.map(p => p.name).join(', ')}</span>
              </div>
            ))}
          </>
        )}
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={onEdit}><IconPencil size={14} /> edit</button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>close</button>
          <button className="btn teal" onClick={onLogPlay}><IconPlus size={14} /> log a session</button>
        </div>
      </div>
    </div>
  )
}
