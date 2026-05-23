export function scoreGame(game, playLog) {
  const gameLogs = playLog.filter(l => l.gameId === game.id)
  const sorted = [...gameLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const lastPlayed = sorted[0] || null
  const daysSince = lastPlayed
    ? (Date.now() - new Date(lastPlayed.date)) / (1000 * 86400)
    : 9999

  const allRatings = gameLogs.flatMap(l => l.players.map(p => p.rating))
  const avgRating = allRatings.length
    ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
    : null

  let score = 50
  if (game.isNew) score += 25
  if (!lastPlayed) score += 15
  if (daysSince > 90) score += 20
  else if (daysSince > 30) score += 10
  if (avgRating && parseFloat(avgRating) >= 4) score += 15

  return { score, lastPlayed, daysSince, avgRating }
}
