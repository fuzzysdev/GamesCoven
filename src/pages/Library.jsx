import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { IconPlus, IconX, IconCheck, IconPencil, IconSearch, IconExternalLink } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import MechanismPicker from '../components/MechanismPicker'
import { searchBGG, fetchBGGGame } from '../utils/bgg'

const TYPES = ['strategy', 'party', 'coop', 'euro', 'horror', 'word']

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
const TYPE_ICONS = { strategy: '♟️', party: '🎉', coop: '🤝', euro: '🏰', horror: '💀', word: '🔤' }

const GAME_EMOJI = [
  '🎲','🃏','♟️','🎭','🏰','🦊','🐺','🦁','🐉','🌊','⚔️','🛡️','💀','👻','🔮',
  '🌙','⭐','🎯','🎪','🎨','📚','🔑','🗝️','💣','🚂','🦠','🧩','🎵','👑','🏆',
  '🌺','🍄','🐙','🦋','🦇','🐦‍⬛','🦅','🐈','🐱','🐭','🐸','🦎','🕷️','🧙','🧝',
  '🧟','🧛','🦹','🥷','🗺️','🏴‍☠️','☠️','🌋','🏔️','🎃','❄️','⚡','🔥','💧','🌿',
  '🌑','☀️','🌠','🪄','🔭','🧪','⚗️','🤖','👾','🚀','🛸','🌌','🎮','🕹️','🎰',
]

function TypeTag({ type }) {
  return <span className={`type-tag tag-${type}`}>{type}</span>
}

function StarRow({ rating }) {
  if (!rating) return null
  const n = Math.round(parseFloat(rating))
  return (
    <div className="star-row">
      {[1,2,3,4,5].map(i => <span key={i} className={`star${i <= n ? ' on' : ''}`}>★</span>)}
    </div>
  )
}

function GameIcon({ game, large = false }) {
  if (game.bggImageUrl) {
    return <img src={game.bggImageUrl} alt={game.name} className={large ? 'game-img-lg' : 'card-img'} />
  }
  return <span className={large ? '' : 'card-emoji'} style={large ? { fontSize: 40 } : {}}>{game.emoji || '🎲'}</span>
}

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

function BGGSearch({ gameName, onApply }) {
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

function GameCard({ game, lastPlayed, avgRating, onClick, index }) {
  const lp = lastPlayed
  const lastInfo = game.isNew
    ? 'fresh out the box'
    : lp ? `last played ${lp.date.slice(0, 7)}` : 'dust gathering...'

  return (
    <div className="game-card" onClick={onClick}>
      {game.isNew && <div className="new-badge">New</div>}
      <div className="card-header-strip">
        <span className="card-num">{ROMAN[index] || (index + 1)}</span>
        <span className="card-type-icon">{TYPE_ICONS[game.type] || '🎲'}</span>
      </div>
      <div className="card-art">
        <GameIcon game={game} />
        <div className="art-rule" />
      </div>
      <div className="card-body">
        <div className="card-name">{game.name}</div>
        <div className={`card-type-label tag-${game.type}`}>{game.type}</div>
        {!lp && !game.isNew && <div className="never-badge">never played</div>}
        <div className="card-meta-row">
          <span className="meta-chip">👥 {game.minPlayers}–{game.maxPlayers}</span>
          <span className="meta-chip">⏱ ~{game.timeEst}m</span>
        </div>
        <div className="card-footer-inner">
          <span className="last-played-txt">{lastInfo}</span>
          <StarRow rating={avgRating} />
        </div>
      </div>
    </div>
  )
}

function GameFormFields({
  name, setName, type, setType, emoji, setEmoji,
  minP, setMinP, maxP, setMaxP, time, setTime,
  boughtDate, setBoughtDate, mechanisms, setMechanisms,
  bggImageUrl, onClearBGGImage, isAdd,
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
    </>
  )
}

function AddGameModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('strategy')
  const [emoji, setEmoji] = useState('🎲')
  const [minP, setMinP] = useState(2)
  const [maxP, setMaxP] = useState(4)
  const [time, setTime] = useState(60)
  const [boughtDate, setBoughtDate] = useState(new Date().toISOString().slice(0, 10))
  const [mechanisms, setMechanisms] = useState([])
  const [bggImageUrl, setBggImageUrl] = useState('')
  const [bggId, setBggId] = useState('')
  const [bggUrl, setBggUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const handleBGGApply = (data) => {
    if (data.name) setName(data.name)
    if (data.minPlayers) setMinP(data.minPlayers)
    if (data.maxPlayers) setMaxP(data.maxPlayers)
    if (data.timeEst) setTime(data.timeEst)
    if (data.bggImageUrl) setBggImageUrl(data.bggImageUrl)
    if (data.bggId) setBggId(data.bggId)
    if (data.bggUrl) setBggUrl(data.bggUrl)
  }

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    await onSave({
      name: name.trim(), type, emoji: emoji || '🎲',
      minPlayers: +minP, maxPlayers: +maxP, timeEst: +time,
      boughtDate, mechanisms,
      ...(bggImageUrl && { bggImageUrl }),
      ...(bggId && { bggId }),
      ...(bggUrl && { bggUrl }),
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title">🎲 add a game to your grimoire</div>
        <BGGSearch gameName={name} onApply={handleBGGApply} />
        <GameFormFields
          name={name} setName={setName} type={type} setType={setType}
          emoji={emoji} setEmoji={setEmoji} minP={minP} setMinP={setMinP}
          maxP={maxP} setMaxP={setMaxP} time={time} setTime={setTime}
          boughtDate={boughtDate} setBoughtDate={setBoughtDate}
          mechanisms={mechanisms} setMechanisms={setMechanisms}
          bggImageUrl={bggImageUrl} onClearBGGImage={() => { setBggImageUrl(''); setBggId(''); setBggUrl('') }}
          isAdd
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
            <IconCheck size={14} /> add game
          </button>
        </div>
      </div>
    </div>
  )
}

function EditGameModal({ game, onClose, onSave }) {
  const [name, setName] = useState(game.name || '')
  const [type, setType] = useState(game.type || 'strategy')
  const [emoji, setEmoji] = useState(game.emoji || '🎲')
  const [minP, setMinP] = useState(game.minPlayers ?? 2)
  const [maxP, setMaxP] = useState(game.maxPlayers ?? 4)
  const [time, setTime] = useState(game.timeEst ?? 60)
  const [boughtDate, setBoughtDate] = useState(game.boughtDate || new Date().toISOString().slice(0, 10))
  const [mechanisms, setMechanisms] = useState(game.mechanisms || [])
  const [bggImageUrl, setBggImageUrl] = useState(game.bggImageUrl || '')
  const [bggId, setBggId] = useState(game.bggId || '')
  const [bggUrl, setBggUrl] = useState(game.bggUrl || '')
  const [busy, setBusy] = useState(false)

  const handleBGGApply = (data) => {
    if (data.name) setName(data.name)
    if (data.minPlayers) setMinP(data.minPlayers)
    if (data.maxPlayers) setMaxP(data.maxPlayers)
    if (data.timeEst) setTime(data.timeEst)
    if (data.bggImageUrl) setBggImageUrl(data.bggImageUrl)
    if (data.bggId) setBggId(data.bggId)
    if (data.bggUrl) setBggUrl(data.bggUrl)
  }

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    await onSave(game.id, {
      name: name.trim(), type, emoji: emoji || '🎲',
      minPlayers: +minP, maxPlayers: +maxP, timeEst: +time,
      boughtDate, mechanisms,
      bggImageUrl: bggImageUrl || '',
      bggId: bggId || '',
      bggUrl: bggUrl || '',
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title"><IconPencil size={16} /> edit {game.name}</div>
        <BGGSearch gameName={name} onApply={handleBGGApply} />
        <GameFormFields
          name={name} setName={setName} type={type} setType={setType}
          emoji={emoji} setEmoji={setEmoji} minP={minP} setMinP={setMinP}
          maxP={maxP} setMaxP={setMaxP} time={time} setTime={setTime}
          boughtDate={boughtDate} setBoughtDate={setBoughtDate}
          mechanisms={mechanisms} setMechanisms={setMechanisms}
          bggImageUrl={bggImageUrl} onClearBGGImage={() => { setBggImageUrl(''); setBggId(''); setBggUrl('') }}
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
            <IconCheck size={14} /> save changes
          </button>
        </div>
      </div>
    </div>
  )
}

function GameDetailModal({ game, playLog, onClose, onLogPlay, onEdit }) {
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
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <GameIcon game={game} large />
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>
              {game.name} {game.isNew && <span className="new-badge">✨ new</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <TypeTag type={game.type} />
              <span className="meta-chip">👥 {game.minPlayers}–{game.maxPlayers}p</span>
              <span className="meta-chip">⏱ ~{game.timeEst}m</span>
            </div>
            {game.bggUrl && (
              <a
                href={game.bggUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--g-teal)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}
              >
                <IconExternalLink size={11} /> View on BoardGameGeek
              </a>
            )}
          </div>
        </div>

        {game.mechanisms?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="mechanism-grid">
              {game.mechanisms.map(m => (
                <span key={m} className="mechanism-chip selected">{m}</span>
              ))}
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
          <button className="btn ghost" onClick={onEdit}>
            <IconPencil size={14} /> edit
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>close</button>
          <button className="btn teal" onClick={onLogPlay}>
            <IconPlus size={14} /> log a session
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Library() {
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [playLog, setPlayLog] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'games'), orderBy('name'))
    return onSnapshot(q, snap => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'playLog'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setPlayLog(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const getLastPlayed = (gameId) => {
    const logs = playLog.filter(l => l.gameId === gameId).sort((a, b) => new Date(b.date) - new Date(a.date))
    return logs[0] || null
  }

  const getAvgRating = (gameId) => {
    const all = playLog.filter(l => l.gameId === gameId).flatMap(l => l.players.map(p => p.rating))
    if (!all.length) return null
    return (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)
  }

  const addGame = async (data) => {
    await addDoc(collection(db, 'users', user.uid, 'games'), {
      ...data, isNew: true, ownerId: user.uid, createdAt: serverTimestamp(),
    })
  }

  const saveEdit = async (id, data) => {
    await updateDoc(doc(db, 'users', user.uid, 'games', id), data)
  }

  const filtered = games.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || g.type === typeFilter
    return matchSearch && matchType
  })

  const selectedGame = modal?.id ? games.find(g => g.id === modal.id) : null

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-box"
          placeholder="🔍 search your grimoire..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input" style={{ width: 'auto', minWidth: 130 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">all types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn primary" onClick={() => setModal('add')}>
          <IconPlus size={14} /> Add game
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔮</div>
          <p>{games.length === 0 ? 'your grimoire is empty — add your first game!' : 'no games match your search'}</p>
        </div>
      ) : (
        <div className="games-grid">
          {filtered.map((g, i) => (
            <GameCard
              key={g.id}
              game={g}
              lastPlayed={getLastPlayed(g.id)}
              avgRating={getAvgRating(g.id)}
              onClick={() => setModal({ type: 'detail', id: g.id })}
              index={i}
            />
          ))}
        </div>
      )}

      {modal === 'add' && (
        <AddGameModal onClose={() => setModal(null)} onSave={addGame} />
      )}
      {modal?.type === 'detail' && selectedGame && (
        <GameDetailModal
          game={selectedGame}
          playLog={playLog}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', id: modal.id })}
          onLogPlay={() => setModal({ type: 'logPlay', id: modal.id })}
        />
      )}
      {modal?.type === 'edit' && selectedGame && (
        <EditGameModal
          game={selectedGame}
          onClose={() => setModal(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}
