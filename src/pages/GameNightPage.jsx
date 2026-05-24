import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, getDocs, collection } from 'firebase/firestore'
import { IconCheck, IconX, IconPlus, IconLock, IconRefresh } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import AuthPage from './AuthPage'

export default function GameNightPage() {
  const { nightId } = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [night, setNight] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [hostGames, setHostGames] = useState([])
  const [writeIn, setWriteIn] = useState('')

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'gameNights', nightId),
      snap => {
        if (!snap.exists()) { setNotFound(true); return }
        setNight({ id: snap.id, ...snap.data() })
      },
      () => setNotFound(true)
    )
  }, [nightId, user?.uid])

  useEffect(() => {
    if (!night || !user || user.uid !== night.hostUid) return
    getDocs(collection(db, 'users', user.uid, 'games'))
      .then(snap => setHostGames(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => !g.baseGameId)
      ))
      .catch(() => {})
  }, [night?.id, user?.uid])

  if (authLoading) return <div className="loading-screen">🦄</div>
  if (!user) return <AuthPage />
  if (notFound) return (
    <div className="gn-page">
      <div className="gn-topbar">
        <span className="logo-text" style={{ color: 'var(--g-purple)' }}>🦄 Grimoire &amp; Games</span>
      </div>
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-icon">🔮</div>
        <p>this game night doesn't exist, or you're not on the guest list</p>
      </div>
    </div>
  )
  if (!night) return <div className="loading-screen">🌙</div>

  const isHost = user.uid === night.hostUid
  const myRsvp = night.rsvps?.[user.uid]
  const pollGames = night.pollGames || []
  const sortedPoll = [...pollGames].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))

  // Build uid → name lookup from the parallel arrays
  const nameByUid = {}
  night.attendeeUids?.forEach((uid, i) => { nameByUid[uid] = night.attendeeNames?.[i] || '?' })

  const rsvp = (answer) =>
    updateDoc(doc(db, 'gameNights', nightId), { [`rsvps.${user.uid}`]: answer })

  const toggleVote = (gameId) => {
    const updated = pollGames.map(g => {
      if (g.id !== gameId) return g
      const votes = [...(g.votes || [])]
      const idx = votes.indexOf(user.uid)
      if (idx >= 0) votes.splice(idx, 1)
      else votes.push(user.uid)
      return { ...g, votes }
    })
    updateDoc(doc(db, 'gameNights', nightId), { pollGames: updated })
  }

  const addWriteIn = () => {
    if (!writeIn.trim()) return
    updateDoc(doc(db, 'gameNights', nightId), {
      pollGames: [...pollGames, {
        id: `writein-${Date.now()}`,
        name: writeIn.trim(),
        emoji: '✏️',
        bggImageUrl: null,
        ownerId: user.uid,
        ownerName: profile?.displayName || '',
        isWriteIn: true,
        votes: [],
      }],
    })
    setWriteIn('')
  }

  const addFromLibrary = (gameId) => {
    const game = hostGames.find(g => g.id === gameId)
    if (!game || pollGames.find(pg => pg.id === gameId)) return
    updateDoc(doc(db, 'gameNights', nightId), {
      pollGames: [...pollGames, {
        id: game.id,
        name: game.name,
        emoji: game.emoji || '🎲',
        bggImageUrl: game.bggImageUrl || null,
        ownerId: user.uid,
        ownerName: profile?.displayName || '',
        isWriteIn: false,
        votes: [],
      }],
    })
  }

  const removeFromPoll = (gameId) =>
    updateDoc(doc(db, 'gameNights', nightId), { pollGames: pollGames.filter(g => g.id !== gameId) })

  const setPollOpen = (open) =>
    updateDoc(doc(db, 'gameNights', nightId), { pollOpen: open })

  return (
    <div className="gn-page">
      <div className="gn-topbar">
        <div className="logo">
          <span className="logo-icon">🦄</span>
          <div className="logo-text">Grimoire &amp; Games</div>
        </div>
        <a href="/" className="gn-back">← back to app</a>
      </div>

      <div className="gn-content">

        {/* Event card */}
        <div className="gn-event-card">
          <div className="gn-event-title">{night.name}</div>
          <div className="gn-event-meta">
            📅 {night.date} &nbsp;·&nbsp; 🕖 {night.time} &nbsp;·&nbsp; 📍 {night.venue}
          </div>

          <div className="gn-rsvp-row">
            <span className="gn-rsvp-label">your rsvp:</span>
            <button
              className={`btn ${myRsvp === 'yes' ? 'teal' : 'ghost'}`}
              style={{ padding: '5px 14px', fontSize: 13 }}
              onClick={() => rsvp('yes')}
            >
              <IconCheck size={13} /> yes!
            </button>
            <button
              className={`btn ${myRsvp === 'no' ? 'pink' : 'ghost'}`}
              style={{ padding: '5px 14px', fontSize: 13 }}
              onClick={() => rsvp('no')}
            >
              <IconX size={13} /> can't make it
            </button>
          </div>

          <div className="attendee-row" style={{ marginTop: 10 }}>
            {night.attendeeUids?.map((uid, i) => {
              const r = night.rsvps?.[uid]
              return (
                <span
                  key={uid}
                  className={`attendee-chip${r === 'yes' ? ' rsvp-yes' : r === 'no' ? ' rsvp-no' : ''}`}
                >
                  {r === 'yes' ? '✓' : r === 'no' ? '✗' : '?'} {night.attendeeNames?.[i]}
                </span>
              )
            })}
          </div>
        </div>

        {/* Poll */}
        <div className="gn-poll-card">
          <div className="gn-poll-header">
            <div className="gn-poll-title">🎲 game poll</div>
            {night.pollOpen
              ? <span className="poll-badge poll-open">voting open</span>
              : <span className="poll-badge poll-closed">🔒 closed</span>}
          </div>

          {sortedPoll.length === 0 ? (
            <div style={{ color: 'var(--g-muted)', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>
              no games in the poll yet
            </div>
          ) : sortedPoll.map(game => {
            const hasVoted = game.votes?.includes(user.uid)
            const voteCount = game.votes?.length || 0
            return (
              <div key={game.id} className={`poll-row${hasVoted ? ' poll-row-voted' : ''}`}>
                <div className="poll-row-icon">
                  {game.bggImageUrl
                    ? <img src={game.bggImageUrl} alt={game.name} className="poll-row-img" />
                    : <span style={{ fontSize: 28 }}>{game.emoji}</span>}
                </div>

                <div className="poll-row-info">
                  <div className="poll-row-name">{game.name}</div>
                  <div className="poll-row-owner">
                    from {game.ownerName}'s grimoire{game.isWriteIn ? ' ✏️' : ''}
                  </div>
                  {game.votes?.length > 0 && (
                    <div className="poll-voter-row">
                      {game.votes.map(uid => (
                        <span key={uid} className="poll-voter-chip">{nameByUid[uid] || '?'}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="poll-row-right">
                  <div className="poll-vote-count">{voteCount}</div>
                  {night.pollOpen && (
                    <button
                      className={`poll-vote-btn${hasVoted ? ' voted' : ''}`}
                      onClick={() => toggleVote(game.id)}
                      title={hasVoted ? 'remove vote' : 'upvote'}
                    >
                      {hasVoted ? '★' : '☆'}
                    </button>
                  )}
                  {isHost && (
                    <button
                      className="btn ghost"
                      style={{ padding: '2px 5px', fontSize: 11, marginLeft: 4 }}
                      onClick={() => removeFromPoll(game.id)}
                      title="remove from poll"
                    >
                      <IconX size={11} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Host controls */}
          {isHost && (
            <div className="gn-host-controls">
              <div className="gn-host-label">host controls</div>

              <select
                className="input"
                style={{ marginBottom: 8 }}
                value=""
                onChange={e => { if (e.target.value) addFromLibrary(e.target.value) }}
              >
                <option value="">add from your library…</option>
                {hostGames
                  .filter(g => !pollGames.find(pg => pg.id === g.id))
                  .map(g => <option key={g.id} value={g.id}>{g.emoji || '🎲'} {g.name}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  className="input"
                  placeholder="write-in a game name…"
                  value={writeIn}
                  onChange={e => setWriteIn(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addWriteIn()}
                />
                <button className="btn ghost" onClick={addWriteIn} disabled={!writeIn.trim()}>
                  <IconPlus size={13} /> add
                </button>
              </div>

              {night.pollOpen
                ? <button className="btn pink" onClick={() => setPollOpen(false)}>
                    <IconLock size={13} /> close poll
                  </button>
                : <button className="btn teal" onClick={() => setPollOpen(true)}>
                    <IconRefresh size={13} /> reopen poll
                  </button>}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
