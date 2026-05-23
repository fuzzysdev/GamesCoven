import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, getDocs,
  doc, updateDoc, getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { IconPlus, IconX, IconCheck } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function ratingEmoji(r) {
  if (r >= 5) return '😍'
  if (r >= 4) return '😊'
  if (r >= 3) return '😐'
  return '😕'
}

function ratingClass(r) {
  if (r >= 4) return 'rating-liked'
  if (r >= 3) return 'rating-meh'
  return 'rating-bad'
}

function LogSessionModal({ onClose, onSave, games }) {
  const { user, profile } = useAuth()
  const [gameId, setGameId] = useState(games[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')
  const [friendIds, setFriendIds] = useState([])
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const snap = await getDoc(doc(db, 'friendships', user.uid))
        if (snap.exists()) {
          const { friends: uids = [] } = snap.data()
          const profiles = await Promise.all(
            uids.map(uid => getDoc(doc(db, 'users', uid)).then(d => d.exists() ? { uid, ...d.data() } : null))
          )
          setFriends(profiles.filter(Boolean))
        }
      } catch (_) {}
    }
    loadFriends()
  }, [user.uid])

  const toggleFriend = (uid) => {
    setSelectedFriends(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const save = async () => {
    if (!gameId) return
    setBusy(true)
    const players = [
      { uid: user.uid, name: profile?.displayName || 'You', rating },
      ...friends.filter(f => selectedFriends.has(f.uid)).map(f => ({ uid: f.uid, name: f.displayName, rating })),
    ]
    const game = games.find(g => g.id === gameId)
    await onSave({
      gameId,
      gameName: game?.name || '',
      date,
      players,
      notes: notes.trim(),
    })
    // Clear isNew on the game if it was new
    if (game?.isNew) {
      await updateDoc(doc(db, 'users', user.uid, 'games', gameId), { isNew: false })
    }
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title">📖 log a session</div>

        <div className="field">
          <label className="label">game</label>
          <select className="input" value={gameId} onChange={e => setGameId(e.target.value)}>
            {games.map(g => <option key={g.id} value={g.id}>{g.emoji || '🎲'} {g.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {friends.length > 0 && (
          <div className="field">
            <label className="label">who else played?</label>
            <div className="player-check-list">
              {friends.map(f => (
                <label key={f.uid} className="player-check">
                  <input
                    type="checkbox"
                    checked={selectedFriends.has(f.uid)}
                    onChange={() => toggleFriend(f.uid)}
                  />
                  {f.emoji || '🎲'} {f.displayName}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="label">your rating</label>
          <div className="rating-row">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                className={`rate-btn${rating >= n ? ' active' : ''}`}
                onClick={() => setRating(n)}
                type="button"
              >{n}★</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label">notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="optional memorable moments..." />
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn teal" onClick={save} disabled={busy || !gameId}>
            <IconCheck size={14} /> save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Log() {
  const { user } = useAuth()
  const [log, setLog] = useState([])
  const [games, setGames] = useState([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'playLog'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setLog(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'games'), orderBy('name'))
    return onSnapshot(q, snap => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const addLog = async (data) => {
    await addDoc(collection(db, 'users', user.uid, 'playLog'), {
      ...data,
      createdAt: serverTimestamp(),
    })
  }

  return (
    <div>
      <div className="section-head">
        <div className="section-title">📖 play log</div>
        <button className="btn primary" onClick={() => setShowModal(true)} disabled={games.length === 0}>
          <IconPlus size={14} /> Log a session
        </button>
      </div>

      {log.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <p>no sessions logged yet — play something!</p>
        </div>
      ) : (
        log.map(entry => (
          <div key={entry.id} className="log-entry">
            <div className="log-header">
              <div className="log-game">{entry.gameName}</div>
              <div className="log-date">{entry.date}</div>
            </div>
            <div className="log-players">
              {entry.players?.map((p, i) => (
                <span key={i} className="player-pill">
                  {p.name}
                  <span className={ratingClass(p.rating)}>{ratingEmoji(p.rating)}</span>
                </span>
              ))}
            </div>
            {entry.notes && <div className="log-notes">"{entry.notes}"</div>}
          </div>
        ))
      )}

      {showModal && (
        <LogSessionModal
          games={games}
          onClose={() => setShowModal(false)}
          onSave={addLog}
        />
      )}
    </div>
  )
}
