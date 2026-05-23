import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

const DEFAULT_EMOJIS = ['🐈', '🦅', '🐦‍⬛', '🦋', '🦇', '🐺', '🦉', '🐙']
const DEFAULT_COLORS = ['#b48cff', '#ff7ec7', '#5dcaa5', '#fac775', '#82c8ff', '#f08080']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub = null

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) { profileUnsub(); profileUnsub = null }

      if (firebaseUser) {
        setUser(firebaseUser)
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          const idx = Math.floor(Math.random() * DEFAULT_EMOJIS.length)
          await setDoc(ref, {
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Witch',
            email: firebaseUser.email || '',
            emoji: DEFAULT_EMOJIS[idx],
            color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            createdAt: serverTimestamp(),
          })
        }
        // Real-time listener so profile edits reflect immediately everywhere
        profileUnsub = onSnapshot(ref, (d) => {
          if (d.exists()) setProfile(d.data())
        })
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => { authUnsub(); if (profileUnsub) profileUnsub() }
  }, [])

  const signOut = () => fbSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
