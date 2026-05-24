import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, query,
  where, orderBy, serverTimestamp, doc, getDoc, getDocs,
} from 'firebase/firestore'
import { IconCalendarPlus, IconX, IconCheck, IconCalendarCheck, IconDownload, IconClipboard } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { downloadICS } from '../utils/ics'

function PlanNightModal({ onClose, onSave, friends, currentUser, currentProfile }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('19:00')
  const [venue, setVenue] = useState('')
  const [selected, setSelected] = useState(new Set([currentUser.uid]))
  const [busy, setBusy] = useState(false)

  const allPeople = [
    { uid: currentUser.uid, displayName: currentProfile?.displayName || 'You', emoji: currentProfile?.emoji || '🐈' },
    ...friends,
  ]

  const toggle = (uid) => {
    if (uid === currentUser.uid) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const save = async () => {
    setBusy(true)
    const attendeeProfiles = allPeople.filter(p => selected.has(p.uid))
    const attendeeNames = attendeeProfiles.map(p => p.displayName)
    await onSave({
      name: name.trim() || 'Game Night',
      date, time,
      venue: venue.trim() || 'TBD',
      hostUid: currentUser.uid,
      attendeeUids: [...selected],
      attendeeNames,
      attendeeProfiles,
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title">🌙 plan a game night</div>

        <div className="field">
          <label className="label">night name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday Fright Night" autoFocus />
        </div>
        <div className="row2">
          <div className="field">
            <label className="label">date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">time</label>
            <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label">venue</label>
          <input className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="your haunted mansion" />
        </div>
        <div className="field">
          <label className="label">who's coming?</label>
          <div className="attendee-row" style={{ marginTop: 8 }}>
            {allPeople.map(p => (
              <span
                key={p.uid}
                className={`attendee-chip${selected.has(p.uid) ? ' selected' : ''}`}
                onClick={() => toggle(p.uid)}
              >
                {p.emoji} {p.displayName}
              </span>
            ))}
          </div>
        </div>
        <div className="field">
          <div className="invite-info">
            <IconCalendarCheck size={14} /> a .ics calendar invite &amp; game poll will be generated
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            <IconCalendarPlus size={14} /> {busy ? 'generating poll…' : 'plan it!'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Nights() {
  const { user, profile } = useAuth()
  const [nights, setNights] = useState([])
  const [friends, setFriends] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const q = query(
      collection(db, 'gameNights'),
      where('attendeeUids', 'array-contains', user.uid),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap => setNights(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

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

  const addNight = async (data) => {
    const { attendeeProfiles, ...nightData } = data

    // Fetch games from all attendee libraries and build poll
    const allGames = []
    await Promise.all(
      nightData.attendeeUids.map(async (uid) => {
        try {
          const ownerProfile = attendeeProfiles.find(p => p.uid === uid)
          const snap = await getDocs(collection(db, 'users', uid, 'games'))
          snap.docs.forEach(d => {
            const game = d.data()
            if (!game.baseGameId) {
              allGames.push({
                ...game,
                id: d.id,
                ownerId: uid,
                ownerName: ownerProfile?.displayName || 'Unknown',
              })
            }
          })
        } catch (_) {}
      })
    )

    // Deduplicate by name, score, pick top 5
    const seen = new Set()
    const pollGames = allGames
      .filter(g => {
        const key = g.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(g => ({ ...g, _score: 50 + (g.isNew ? 25 : 0) + Math.random() * 10 }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score, ...g }) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji || '🎲',
        bggImageUrl: g.bggImageUrl || null,
        ownerId: g.ownerId,
        ownerName: g.ownerName,
        isWriteIn: false,
        votes: [],
      }))

    await addDoc(collection(db, 'gameNights'), {
      ...nightData,
      pollGames,
      pollOpen: true,
      rsvps: { [nightData.hostUid]: 'yes' },
      createdAt: serverTimestamp(),
    })
  }

  const copyLink = (nightId) => {
    navigator.clipboard.writeText(`${window.location.origin}/night/${nightId}`)
    setCopiedId(nightId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <div className="section-head">
        <div className="section-title">🌙 game nights</div>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <IconCalendarPlus size={14} /> Plan a night
        </button>
      </div>

      {nights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌙</div>
          <p>no nights planned yet — summon your coven!</p>
        </div>
      ) : (
        nights.map(n => {
          const rsvpYes = Object.values(n.rsvps || {}).filter(v => v === 'yes').length
          const rsvpNo  = Object.values(n.rsvps || {}).filter(v => v === 'no').length
          const totalVotes = (n.pollGames || []).reduce((s, g) => s + (g.votes?.length || 0), 0)
          return (
            <div key={n.id} className="night-card">
              <div className="night-title">{n.name}</div>
              <div className="night-meta">{n.date} · {n.time} · {n.venue}</div>
              <div className="attendee-row">
                {(n.attendeeNames || []).map(name => (
                  <span key={name} className="attendee-chip selected">{name}</span>
                ))}
              </div>
              <div className="night-stats-row">
                <span className="night-stat">✓ {rsvpYes} yes · ✗ {rsvpNo} no</span>
                {n.pollGames?.length > 0 && (
                  <span className="night-stat">
                    🎲 {n.pollGames.length} games · {totalVotes} votes · {n.pollOpen ? 'open' : '🔒 closed'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => copyLink(n.id)}>
                  <IconClipboard size={13} /> {copiedId === n.id ? 'copied!' : 'copy link'}
                </button>
                <button className="btn teal" style={{ fontSize: 12 }} onClick={() => downloadICS(n)}>
                  <IconDownload size={13} /> Download .ics
                </button>
              </div>
            </div>
          )
        })
      )}

      {showModal && (
        <PlanNightModal
          friends={friends}
          currentUser={user}
          currentProfile={profile}
          onClose={() => setShowModal(false)}
          onSave={addNight}
        />
      )}
    </div>
  )
}
