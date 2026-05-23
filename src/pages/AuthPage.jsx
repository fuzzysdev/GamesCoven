import { useState } from 'react'
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

const provider = new GoogleAuthProvider()

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleGoogle = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(cred.user, { displayName: name })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e) {
      const msgs = {
        'auth/invalid-credential': 'Wrong email or password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
      }
      setError(msgs[e.code] || e.message)
    }
    setBusy(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🦄</div>
          <div className="auth-logo-text">Grimoire &amp; Games</div>
          <div className="auth-logo-sub">your haunted game library</div>
        </div>

        <button className="google-btn" onClick={handleGoogle} disabled={busy}>
          <span>G</span> Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <form onSubmit={handleEmail}>
          {mode === 'signup' && (
            <div className="field">
              <label className="label">your name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Witch name" />
            </div>
          )}
          <div className="field">
            <label className="label">email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@coven.dev" required />
          </div>
          <div className="field">
            <label className="label">password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'signin' ? (
            <>No account? <button onClick={() => { setMode('signup'); setError('') }}>Sign up</button></>
          ) : (
            <>Have an account? <button onClick={() => { setMode('signin'); setError('') }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
