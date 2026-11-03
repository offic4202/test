const lagos = {
  timeZone: "Africa/Lagos",
} as const

export function lagosStamp(ms: number) {
  return `${new Intl.DateTimeFormat("en-GB", {
    ...lagos,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms))} WAT`
}

export function lagosClock(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    ...lagos,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function viewersLabel(plays: number, returns: number) {
  if (!plays && !returns) return null
  const playWord = plays === 1 ? "play" : "plays"
  const returnWord = returns === 1 ? "return" : "returns"
  return `${plays} ${playWord} · ${returns} ${returnWord}`
}
