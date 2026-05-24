import { IconPlus } from '@tabler/icons-react'
import { TYPE_ICONS } from '../utils/constants'

export function TypeTag({ type }) {
  return <span className={`type-tag tag-${type}`}>{type}</span>
}

export function StarRow({ rating }) {
  if (!rating) return null
  const n = Math.round(parseFloat(rating))
  return (
    <div className="star-row">
      {[1,2,3,4,5].map(i => <span key={i} className={`star${i <= n ? ' on' : ''}`}>★</span>)}
    </div>
  )
}

export function GameIcon({ game, large = false }) {
  if (game.bggImageUrl) {
    return <img src={game.bggImageUrl} alt={game.name} className={large ? 'game-img-lg' : 'card-img'} />
  }
  return <span className={large ? '' : 'card-emoji'} style={large ? { fontSize: 40 } : {}}>{game.emoji || '🎲'}</span>
}

export default function GameCard({ game, lastPlayed, avgRating, onClick, onAddExpansion, index }) {
  const lp = lastPlayed
  const lastInfo = game.isNew
    ? 'fresh out the box'
    : lp ? `last played ${lp.date.slice(0, 7)}` : 'dust gathering...'

  return (
    <div className="game-card" onClick={onClick}>
      {game.isNew && <div className="new-badge">New</div>}
      <div className="card-header-strip">
        <span className="card-type-icon">{TYPE_ICONS[game.type] || '🎲'}</span>
      </div>
      <div className="card-art">
        <GameIcon game={game} />
        <div className="art-rule" />
      </div>
      <div className="card-body">
        <div className="card-name">{game.name}</div>
        <div className={`card-type-label tag-${game.type}`}>{game.type}</div>
        {!lp && !game.isNew && <div className="never-badge">never played</div>}
        <div className="card-meta-row">
          <span className="meta-chip">👥 {game.minPlayers}–{game.maxPlayers}</span>
          <span className="meta-chip">⏱ ~{game.timeEst}m</span>
        </div>
        <div className="card-footer-inner">
          <span className="last-played-txt">{lastInfo}</span>
          <StarRow rating={avgRating} />
        </div>
        <button
          className="expansion-add-btn"
          onClick={e => { e.stopPropagation(); onAddExpansion() }}
          title="add expansion"
        >
          <IconPlus size={9} /> expansion
        </button>
      </div>
    </div>
  )
}
