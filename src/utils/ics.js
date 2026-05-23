export function downloadICS(night) {
  const { name, date, time = '19:00', venue = '', attendees = [] } = night
  const [h, m] = time.split(':').map(Number)
  const endH = String(h + 3).padStart(2, '0')
  const d = date.replace(/-/g, '')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grimoire and Games//EN',
    'BEGIN:VEVENT',
    `DTSTART:${d}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`,
    `DTEND:${d}T${endH}${String(m).padStart(2,'0')}00`,
    `SUMMARY:${name}`,
    `LOCATION:${venue}`,
    `DESCRIPTION:Game night with ${attendees.join(', ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
