import { useState, useEffect } from 'react'
import {
  doc, getDoc, setDoc, getDocs, collection,
  query, orderBy, where, arrayUnion,
} from 'firebase/firestore'
import { IconUserPlus, IconX, IconCheck } from '@tabler/icons-react'

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
const TYPE_ICONS = { strategy: '♟️', party: '🎉', coop: '🤝', euro: '🏰', horror: '💀', word: '🔤' }
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function AddFriendModal({ onClose, onAdd }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async () => {
    if (!email.trim()) return
    setBusy(true)
    setError('')
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
      const snap = await getDocs(q)
      if (snap.empty) {
        setError('No user found with that email. They need to sign up first!')
      } else {
        const found = { uid: snap.docs[0].id, ...snap.docs[0].data() }
        await onAdd(found)
        onClose()
      }
    } catch (e) {
      setError('Something went wrong. Try again.')
    }
    setBusy(false)
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title">🐈 add a friend to your coven</div>
        <div className="field">
          <label className="label">friend's email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@coven.dev"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={search} disabled={busy || !email.trim()}>
            <IconCheck size={14} /> {busy ? 'searching...' : 'add to coven'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FriendLibraryModal({ friend, games, onClose }) {
  const sorted = [...games].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: `${friend.color || '#b48cff'}22`,
              color: friend.color || '#b48cff',
              border: `1px solid ${friend.color || '#b48cff'}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}
          >{friend.emoji || '🎲'}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{friend.displayName}'s library</div>
            <div style={{ fontSize: 12, color: 'var(--g-muted)' }}>{games.length} game{games.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {friend.favMechanisms?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--g-muted)', marginBottom: 6 }}>favourite types</div>
            <div className="mechanism-grid">
              {friend.favMechanisms.map(m => (
                <span key={m} className="mechanism-chip selected" style={{ fontSize: 11 }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔮</div><p>no games yet</p></div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div className="games-grid">
              {sorted.map((g, i) => (
                <div key={g.id} className="game-card" style={{ cursor: 'default' }}>
                  <div className="card-header-strip">
                    <span className="card-num">{ROMAN[i] || (i + 1)}</span>
                    <span className="card-type-icon">{TYPE_ICONS[g.type] || '🎲'}</span>
                  </div>
                  <div className="card-art">
                    {g.bggImageUrl
                      ? <img src={g.bggImageUrl} alt={g.name} className="card-img" />
                      : <span className="card-emoji">{g.emoji || '🎲'}</span>
                    }
                    <div className="art-rule" />
                  </div>
                  <div className="card-body">
                    <div className="card-name">{g.name}</div>
                    <div className={`card-type-label tag-${g.type}`}>{g.type}</div>
                    <div className="card-meta-row">
                      <span className="meta-chip">👥 {g.minPlayers}–{g.maxPlayers}</span>
                      <span className="meta-chip">⏱ ~{g.timeEst}m</span>
                    </div>
                    {g.mechanisms?.length > 0 && (
                      <div className="mechanism-grid" style={{ marginTop: 4 }}>
                        {g.mechanisms.slice(0, 2).map(m => (
                          <span key={m} className="mechanism-chip selected" style={{ fontSize: 10, padding: '2px 8px' }}>{m}</span>
                        ))}
                        {g.mechanisms.length > 2 && (
                          <span className="mechanism-chip" style={{ fontSize: 10, padding: '2px 8px' }}>+{g.mechanisms.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={onClose}>close</button>
        </div>
      </div>
    </div>
  )
}

export default function Friends() {
  const { user, profile } = useAuth()
  const [friends, setFriends] = useState([])
  const [friendGames, setFriendGames] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewingFriend, setViewingFriend] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadFriends = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'friendships', user.uid))
      const uids = snap.exists() ? (snap.data().friends || []) : []
      const profiles = await Promise.all(
        uids.map(uid => getDoc(doc(db, 'users', uid)).then(d => d.exists() ? { uid, ...d.data() } : null))
      )
      const validFriends = profiles.filter(Boolean)
      setFriends(validFriends)

      const gamesMap = {}
      await Promise.all(
        validFriends.map(async f => {
          const gSnap = await getDocs(collection(db, 'users', f.uid, 'games'))
          gamesMap[f.uid] = gSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        })
      )
      setFriendGames(gamesMap)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { loadFriends() }, [user.uid])

  const addFriend = async (foundUser) => {
    if (foundUser.uid === user.uid) return
    const ref = doc(db, 'friendships', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await setDoc(ref, { friends: arrayUnion(foundUser.uid) }, { merge: true })
    } else {
      await setDoc(ref, { friends: [foundUser.uid] })
    }
    await loadFriends()
  }

  return (
    <div>
      <div className="section-head">
        <div className="section-title">🐈 your coven</div>
        <button className="btn pink" onClick={() => setShowAddModal(true)}>
          <IconUserPlus size={14} /> Add friend
        </button>
      </div>

      {/* Current user */}
      <div className="user-card" style={{ borderColor: 'rgba(180,140,255,0.35)' }}>
        <div
          className="user-avatar-lg"
          style={{ background: `${profile?.color || '#b48cff'}22`, color: profile?.color || '#b48cff', border: `1px solid ${profile?.color || '#b48cff'}44` }}
        >
          {profile?.emoji || '🐈'}
        </div>
        <div className="user-info">
          <div className="user-name">
            {profile?.displayName || 'You'}
            <span style={{ fontSize: 11, color: 'var(--g-muted)', marginLeft: 6 }}>(you)</span>
          </div>
          <div className="user-stats">{profile?.email}</div>
          {profile?.favMechanisms?.length > 0 && (
            <div className="mechanism-grid" style={{ marginTop: 6 }}>
              {profile.favMechanisms.slice(0, 5).map(m => (
                <span key={m} className="mechanism-chip selected" style={{ fontSize: 10, padding: '2px 8px' }}>{m}</span>
              ))}
              {profile.favMechanisms.length > 5 && (
                <span className="mechanism-chip" style={{ fontSize: 10, padding: '2px 8px' }}>+{profile.favMechanisms.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="empty-state"><p>loading your coven...</p></div>}

      {!loading && friends.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🦇</div>
          <p>your coven is empty — add friends by email to share libraries!</p>
        </div>
      )}

      {friends.map(f => {
        const games = friendGames[f.uid] || []
        return (
          <div
            key={f.uid}
            className="user-card"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
            onClick={() => setViewingFriend(f)}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(180,140,255,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
          >
            <div
              className="user-avatar-lg"
              style={{ background: `${f.color || '#b48cff'}22`, color: f.color || '#b48cff', border: `1px solid ${f.color || '#b48cff'}44` }}
            >
              {f.emoji || '🎲'}
            </div>
            <div className="user-info">
              <div className="user-name">{f.displayName}</div>
              <div className="user-stats">
                {games.length} game{games.length !== 1 ? 's' : ''} · click to view library
              </div>
              {f.favMechanisms?.length > 0 && (
                <div className="mechanism-grid" style={{ marginTop: 6 }}>
                  {f.favMechanisms.slice(0, 5).map(m => (
                    <span key={m} className="mechanism-chip selected" style={{ fontSize: 10, padding: '2px 8px' }}>{m}</span>
                  ))}
                  {f.favMechanisms.length > 5 && (
                    <span className="mechanism-chip" style={{ fontSize: 10, padding: '2px 8px' }}>+{f.favMechanisms.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {showAddModal && (
        <AddFriendModal onClose={() => setShowAddModal(false)} onAdd={addFriend} />
      )}

      {viewingFriend && (
        <FriendLibraryModal
          friend={viewingFriend}
          games={friendGames[viewingFriend.uid] || []}
          onClose={() => setViewingFriend(null)}
        />
      )}
    </div>
  )
}
