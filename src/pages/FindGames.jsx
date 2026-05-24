import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'
import { IconWand } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { scoreGame } from '../utils/scoring'
import { TYPES } from '../utils/constants'

const ROMAN = ['I', 'II', 'III', 'IV']

export default function FindGames() {
  const { user } = useAuth()
  const [players, setPlayers] = useState(4)
  const [time, setTime] = useState(60)
  const [genre, setGenre] = useState('')
  const [libScope, setLibScope] = useState('all')
  const [results, setResults] = useState(null) // null = not run yet
  const [busy, setBusy] = useState(false)

  const runSuggestion = async () => {
    setBusy(true)
    setResults(null)

    // Load current user's games
    const myGamesSnap = await getDocs(query(collection(db, 'users', user.uid, 'games')))
    let games = myGamesSnap.docs.map(d => ({ id: d.id, ownerId: user.uid, ...d.data() }))

    // Load friends' games if "all libraries"
    if (libScope === 'all') {
      try {
        const friendshipDoc = await getDoc(doc(db, 'friendships', user.uid))
        if (friendshipDoc.exists()) {
          const { friends = [] } = friendshipDoc.data()
          const friendGamePromises = friends.map(fuid =>
            getDocs(collection(db, 'users', fuid, 'games'))
              .then(snap => snap.docs.map(d => ({ id: d.id, ownerId: fuid, ...d.data() })))
              .catch(() => [])
          )
          const friendGames = (await Promise.all(friendGamePromises)).flat()
          games = [...games, ...friendGames]
        }
      } catch (_) {}
    }

    // Load play log for scoring
    const logSnap = await getDocs(collection(db, 'users', user.uid, 'playLog'))
    const playLog = logSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Filter + score
    const pool = games
      .filter(g =>
        +players >= g.minPlayers &&
        +players <= g.maxPlayers &&
        g.timeEst <= +time &&
        (!genre || g.type === genre)
      )
      .map(g => {
        const { score, lastPlayed, daysSince, avgRating } = scoreGame(g, playLog)
        return { ...g, score, lastPlayed, daysSince, avgRating }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    setResults(pool)
    setBusy(false)
  }

  const getReason = (g) => {
    const parts = []
    if (g.isNew) parts.push('✨ brand new!')
    else if (!g.lastPlayed) parts.push('🕸️ never played')
    else if (g.daysSince > 90) parts.push(`🗓️ last played ${Math.round(g.daysSince)}d ago`)
    else parts.push(`last played ${g.lastPlayed.date.slice(0, 7)}`)
    if (g.avgRating) parts.push(`avg ★ ${g.avgRating}`)
    return parts.join(' · ')
  }

  return (
    <div>
      <div className="finder-panel">
        <div className="finder-title">what kind of night is it?</div>
        <div className="filter-row">
          <div className="filter-group">
            <span className="label">players tonight</span>
            <select className="input" style={{ width: 110 }} value={players} onChange={e => setPlayers(e.target.value)}>
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} players</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="label">time available</span>
            <select className="input" style={{ width: 130 }} value={time} onChange={e => setTime(e.target.value)}>
              <option value={30}>~30 min</option>
              <option value={60}>~1 hour</option>
              <option value={90}>~1.5 hours</option>
              <option value={120}>~2 hours</option>
              <option value={999}>no limit</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="label">game type</span>
            <select className="input" style={{ width: 120 }} value={genre} onChange={e => setGenre(e.target.value)}>
              <option value="">anything</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="label">include friends</span>
            <select className="input" style={{ width: 140 }} value={libScope} onChange={e => setLibScope(e.target.value)}>
              <option value="all">all libraries</option>
              <option value="mine">just my games</option>
            </select>
          </div>
          <button className="btn teal" style={{ alignSelf: 'flex-end' }} onClick={runSuggestion} disabled={busy}>
            <IconWand size={14} /> {busy ? 'thinking...' : 'Suggest!'}
          </button>
        </div>
      </div>

      {results === null && (
        <div className="empty-state">
          <div className="empty-icon">🔮</div>
          <p>set your filters and hit Suggest! to find tonight's game</p>
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔮</div>
          <p>no games match those constraints — try loosening the filters!</p>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <>
          <div className="suggestions-title">suggested for tonight</div>
          {results.map((g, i) => (
            <div key={g.id + g.ownerId} className="suggestion-card">
              <div className="sug-rank">{ROMAN[i]}</div>
              {g.bggImageUrl
                ? <img src={g.bggImageUrl} alt={g.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                : <span className="sug-emoji">{g.emoji || '🎲'}</span>
              }
              <div className="sug-info">
                <div className="sug-name">
                  {g.name}
                  {g.isNew && <span style={{ fontSize: 10, background: 'rgba(255,126,199,0.12)', border: '1px solid rgba(255,126,199,0.3)', color: 'var(--g-pink)', padding: '1px 7px', borderRadius: 20, fontFamily: 'Crimson Text, serif', fontStyle: 'italic', marginLeft: 8 }}>new</span>}
                </div>
                <div className="sug-why">
                  {getReason(g)} · 👥 {g.minPlayers}–{g.maxPlayers}p · ⏱ ~{g.timeEst}m
                </div>
              </div>
              <div className="sug-score">
                <span className="sug-score-num">{g.score}</span>
                <span className="sug-score-lbl">match</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
