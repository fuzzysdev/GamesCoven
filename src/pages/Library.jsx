import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { IconPlus } from '@tabler/icons-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TYPES } from '../utils/constants'
import GameCard from '../components/GameCard'
import { AddGameModal, EditGameModal, GameDetailModal } from '../components/GameModals'

export default function Library() {
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [playLog, setPlayLog] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'games'), orderBy('name'))
    return onSnapshot(q, snap => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'playLog'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setPlayLog(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const getLastPlayed = (gameId) => {
    const logs = playLog.filter(l => l.gameId === gameId).sort((a, b) => new Date(b.date) - new Date(a.date))
    return logs[0] || null
  }

  const getAvgRating = (gameId) => {
    const all = playLog.filter(l => l.gameId === gameId).flatMap(l => l.players.map(p => p.rating))
    if (!all.length) return null
    return (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)
  }

  const addGame = async (data) => {
    await addDoc(collection(db, 'users', user.uid, 'games'), {
      ...data, isNew: true, ownerId: user.uid, createdAt: serverTimestamp(),
    })
  }

  const saveEdit = async (id, data) => {
    await updateDoc(doc(db, 'users', user.uid, 'games', id), data)
  }

  const filtered = games.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || g.type === typeFilter
    return matchSearch && matchType
  })

  const expansionsByBaseId = {}
  games.forEach(g => {
    if (g.baseGameId) {
      if (!expansionsByBaseId[g.baseGameId]) expansionsByBaseId[g.baseGameId] = []
      expansionsByBaseId[g.baseGameId].push(g)
    }
  })
  const baseFiltered = filtered.filter(g => !g.baseGameId)
  const selectedGame = modal?.id ? games.find(g => g.id === modal.id) : null

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-box"
          placeholder="🔍 search your grimoire..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input" style={{ width: 'auto', minWidth: 130 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">all types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn primary" onClick={() => setModal('add')}>
          <IconPlus size={14} /> Add game
        </button>
      </div>

      {baseFiltered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔮</div>
          <p>{games.filter(g => !g.baseGameId).length === 0 ? 'your grimoire is empty — add your first game!' : 'no games match your search'}</p>
        </div>
      ) : (
        <div className="games-grid">
          {baseFiltered.map((g, i) => (
            <div key={g.id} className="game-group-slot">
              <GameCard
                game={g}
                lastPlayed={getLastPlayed(g.id)}
                avgRating={getAvgRating(g.id)}
                onClick={() => setModal({ type: 'detail', id: g.id })}
                onAddExpansion={() => setModal({ type: 'addExpansion', baseGame: { id: g.id, name: g.name } })}
                index={i}
              />
              {(expansionsByBaseId[g.id] || []).length > 0 && (
                <div className="expansion-list">
                  {expansionsByBaseId[g.id].map(exp => (
                    <div key={exp.id} className="expansion-row" onClick={() => setModal({ type: 'detail', id: exp.id })}>
                      <span className="exp-chevron">↳</span>
                      <span className="exp-icon">
                        {exp.bggImageUrl
                          ? <img src={exp.bggImageUrl} alt="" style={{ width: 14, height: 14, borderRadius: 2, objectFit: 'cover', verticalAlign: 'middle' }} />
                          : (exp.emoji || '🧩')}
                      </span>
                      <span className="exp-name">{exp.name}</span>
                      {exp.isNew && <span className="exp-new">new</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'add' && (
        <AddGameModal onClose={() => setModal(null)} onSave={addGame} />
      )}
      {modal?.type === 'addExpansion' && (
        <AddGameModal onClose={() => setModal(null)} onSave={addGame} baseGame={modal.baseGame} />
      )}
      {modal?.type === 'detail' && selectedGame && (
        <GameDetailModal
          game={selectedGame}
          playLog={playLog}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', id: modal.id })}
          onLogPlay={() => setModal({ type: 'logPlay', id: modal.id })}
        />
      )}
      {modal?.type === 'edit' && selectedGame && (
        <EditGameModal
          game={selectedGame}
          onClose={() => setModal(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}
