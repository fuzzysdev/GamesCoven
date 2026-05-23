import { useState } from 'react'
import { updateProfile as fbUpdateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { IconX, IconCheck, IconKey } from '@tabler/icons-react'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import MechanismPicker from './MechanismPicker'

const AVATAR_EMOJI = [
  '🐈','🦅','🐦‍⬛','🦋','🦇','🐺','🦉','🐙','🧙','🧝','🧟','🧛',
  '🦹','🥷','🦊','🐸','🦁','🐉','🌙','⭐','🔮','🎭','👑','🦎',
  '🕷️','🐱','🐭','🐰','🐻','🐼','🐨','🦄','🐬','🦈','🐊','🦖',
  '🌊','🌌','🌺','🍄','🌸','🌑','☀️','❄️','⚡','🔥','🌿','🪄',
]

function EmojiPicker({ selected, onSelect }) {
  return (
    <div className="emoji-grid">
      {AVATAR_EMOJI.map(e => (
        <button
          key={e}
          type="button"
          className={`emoji-btn${selected === e ? ' selected' : ''}`}
          onClick={() => onSelect(e)}
          title={e}
        >{e}</button>
      ))}
    </div>
  )
}

export default function ProfileModal({ onClose }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState(profile?.displayName || '')
  const [emoji, setEmoji] = useState(profile?.emoji || '🐈')
  const [favMechanisms, setFavMechanisms] = useState(profile?.favMechanisms || [])
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        emoji,
        favMechanisms,
      })
      if (user.displayName !== name.trim()) {
        await fbUpdateProfile(user, { displayName: name.trim() })
      }
      onClose()
    } catch (e) {
      setError('Failed to save. Try again.')
    }
    setBusy(false)
  }

  const sendReset = async () => {
    setBusy(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, user.email)
      setResetSent(true)
    } catch (e) {
      setError('Could not send reset email. Are you signed in with Google?')
    }
    setBusy(false)
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><IconX size={18} /></button>
        <div className="modal-title">🐈 your profile</div>

        <div className="profile-avatar-preview">{emoji}</div>

        <div className="field">
          <label className="label">display name</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="your witch name"
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label">avatar emoji</label>
          <div className="emoji-picker-wrap">
            <EmojiPicker selected={emoji} onSelect={setEmoji} />
          </div>
        </div>

        <div className="field">
          <label className="label">
            favourite game types
            {favMechanisms.length > 0 && (
              <span style={{ color: 'var(--g-purple)', marginLeft: 8 }}>{favMechanisms.length} selected</span>
            )}
          </label>
          <MechanismPicker selected={favMechanisms} onChange={setFavMechanisms} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="modal-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>cancel</button>
            <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
              <IconCheck size={14} /> save profile
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--g-border)', paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--g-muted)', marginBottom: 8 }}>
              signed in as {user.email}
            </div>
            {!resetSent ? (
              <button
                className="btn ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={sendReset}
                disabled={busy}
              >
                <IconKey size={14} /> send password reset email
              </button>
            ) : (
              <div className="success-msg">✓ reset email sent to {user.email}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
