const PROXY = 'https://corsproxy.io/?'

function proxied(url) {
  return PROXY + encodeURIComponent(url)
}

function normaliseImageUrl(raw) {
  if (!raw) return ''
  raw = raw.trim()
  if (raw.startsWith('//')) return 'https:' + raw
  return raw
}

export async function searchBGG(query) {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`
  const res = await fetch(proxied(url))
  if (!res.ok) throw new Error('Search failed')
  const text = await res.text()
  const xmlDoc = new DOMParser().parseFromString(text, 'text/xml')
  return [...xmlDoc.querySelectorAll('item')].slice(0, 10).map(item => ({
    id: item.getAttribute('id'),
    name:
      item.querySelector('name[type="primary"]')?.getAttribute('value') ||
      item.querySelector('name')?.getAttribute('value') ||
      'Unknown',
    year: item.querySelector('yearpublished')?.getAttribute('value') || '',
  }))
}

async function fetchThingXml(id) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}`
  const res = await fetch(proxied(url))
  if (!res.ok) throw new Error('Fetch failed')
  const text = await res.text()
  return new DOMParser().parseFromString(text, 'text/xml')
}

export async function fetchBGGGame(id) {
  let xmlDoc = await fetchThingXml(id)
  let item = xmlDoc.querySelector('item')

  // BGG sometimes queues requests and returns an empty response — retry once
  if (!item) {
    await new Promise(r => setTimeout(r, 2500))
    xmlDoc = await fetchThingXml(id)
    item = xmlDoc.querySelector('item')
  }

  if (!item) throw new Error('No data returned')

  const imageUrl = normaliseImageUrl(item.querySelector('image')?.textContent)
  const thumbnail = normaliseImageUrl(item.querySelector('thumbnail')?.textContent)
  const minPlayers = parseInt(item.querySelector('minplayers')?.getAttribute('value') || '2')
  const maxPlayers = parseInt(item.querySelector('maxplayers')?.getAttribute('value') || '4')
  const playingTime = parseInt(item.querySelector('playingtime')?.getAttribute('value') || '60')

  return {
    bggId: id,
    bggUrl: `https://boardgamegeek.com/boardgame/${id}`,
    bggImageUrl: imageUrl || thumbnail,
    minPlayers: isNaN(minPlayers) ? 2 : minPlayers,
    maxPlayers: isNaN(maxPlayers) ? 4 : maxPlayers,
    timeEst: isNaN(playingTime) ? 60 : playingTime,
  }
}
