import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { IconBooks, IconWand, IconMoon, IconNotebook, IconUsers } from '@tabler/icons-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Library from './pages/Library'
import FindGames from './pages/FindGames'
import Nights from './pages/Nights'
import Log from './pages/Log'
import Friends from './pages/Friends'
import ProfileModal from './components/ProfileModal'
import UnicornEasterEgg from './components/UnicornEasterEgg'
import GameNightPage from './pages/GameNightPage'

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

const NAV = [
  { id: 'library', label: 'Library', icon: IconBooks },
  { id: 'find',    label: 'Find',    icon: IconWand },
  { id: 'nights',  label: 'Nights',  icon: IconMoon },
  { id: 'log',     label: 'Log',     icon: IconNotebook },
  { id: 'friends', label: 'Friends', icon: IconUsers },
]

function AppShell() {
  const { user, profile, loading, signOut } = useAuth()
  const [view, setView] = useState('library')
  const [showProfile, setShowProfile] = useState(false)
  const [showUnicorn, setShowUnicorn] = useState(false)
  const konamiBuffer = useRef([])

  useEffect(() => {
    const handleKey = (e) => {
      const buf = [...konamiBuffer.current, e.key].slice(-KONAMI.length)
      konamiBuffer.current = buf
      if (buf.join(',') === KONAMI.join(',')) {
        setShowUnicorn(true)
        konamiBuffer.current = []
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const delay = (3 + Math.random() * 5) * 60 * 1000
    const t = setTimeout(() => setShowUnicorn(true), delay)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <div className="loading-screen">🦄</div>
  if (!user) return <AuthPage />

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🦄</span>
          <div>
            <div className="logo-text">Grimoire &amp; Games</div>
            <div className="logo-sub">your haunted game library</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-btn${view === id ? ' active' : ''}`}
              onClick={() => setView(id)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        <div className="user-area">
          <div
            className="avatar"
            title={`${profile?.displayName} — click to edit profile`}
            onClick={() => setShowProfile(true)}
            style={{ cursor: 'pointer' }}
          >
            {profile?.emoji || '🐈'}
          </div>
          <span style={{ fontSize: 12, color: 'var(--g-muted)' }}>{profile?.displayName}</span>
          <button className="sign-out-btn" onClick={signOut}>sign out</button>
        </div>
      </header>

      <main className="content">
        {view === 'library'  && <Library />}
        {view === 'find'     && <FindGames />}
        {view === 'nights'   && <Nights />}
        {view === 'log'      && <Log />}
        {view === 'friends'  && <Friends />}
      </main>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showUnicorn && <UnicornEasterEgg onDone={() => setShowUnicorn(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/night/:nightId" element={<GameNightPage />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
