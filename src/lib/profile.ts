export type Profile = { username: string; avatarDataUrl: string | null }

export function profileInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || 'A'
}

export function profileColor(username: string) {
  let hash = 0
  for (const character of username) hash = (hash * 31 + character.charCodeAt(0)) % 360
  return `hsl(${hash} 42% 42%)`
}