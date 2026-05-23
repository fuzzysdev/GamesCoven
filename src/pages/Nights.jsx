import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, query,
  where, orderBy, serverTimestamp, doc, getDoc,
} from 'firebase/firestore'
import { IconCalendarPlus, IconX, IconCheck, IconCalendarCheck, IconDownload } from '@tabler/icons-react'
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
    if (uid === currentUser.uid) return // host always included
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const save = async () => {
    setBusy(true)
    const attendeeNames = allPeople.filter(p => selected.has(p.uid)).map(p => p.displayName)
    await onSave({
      name: name.trim() || 'Game Night',
      date,
      time,
      venue: venue.trim() || 'TBD',
      hostUid: currentUser.uid,
      attendeeUids: [...selected],
      attendeeNames,
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
            <IconCalendarCheck size={14} /> a .ics calendar invite will be generated for download
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            <IconCalendarPlus size={14} /> plan it!
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
    await addDoc(collection(db, 'gameNights'), { ...data, createdAt: serverTimestamp() })
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
        nights.map(n => (
          <div key={n.id} className="night-card">
            <div className="night-title">{n.name}</div>
            <div className="night-meta">{n.date} · {n.time} · {n.venue}</div>
            <div className="attendee-row">
              {(n.attendeeNames || []).map(name => (
                <span key={name} className="attendee-chip selected">{name}</span>
              ))}
            </div>
            <button className="btn teal" style={{ fontSize: 12 }} onClick={() => downloadICS(n)}>
              <IconDownload size={13} /> Download .ics
            </button>
          </div>
        ))
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
