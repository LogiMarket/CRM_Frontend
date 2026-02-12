import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isLikelyPhoneText(value: string) {
  const v = String(value || '').trim()
  if (!v) return false

  // Common placeholders we store/receive
  if (v.toLowerCase().startsWith('whatsapp:+')) return true
  if (v.toLowerCase().startsWith('whatsapp:')) return true

  // Phone-ish: digits + common separators
  const phoneish = v.replace(/[\s\-().]/g, '')
  return /^\+?\d{7,}$/.test(phoneish)
}

export function formatPhoneForDisplay(raw: string) {
  let v = String(raw || '').trim()
  if (!v) return v

  // Strip common channel prefixes
  v = v.replace(/^whatsapp:/i, '')

  // Keep leading + if present, but remove other non-digits
  const hasPlus = v.startsWith('+')
  const digits = v.replace(/\D/g, '')
  if (!digits) return raw

  const ten = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`

  // Mexico mobile often arrives as 52 + 1 + 10 digits
  if (digits.length === 13 && digits.startsWith('52')) {
    const rest = digits.slice(2)
    const maybeMobileFlag = rest.slice(0, 1)
    const national = rest.slice(1)
    if (maybeMobileFlag === '1' && national.length === 10) {
      return `+52 1 ${ten(national)}`
    }
  }

  if (digits.length > 10) {
    const cc = digits.slice(0, digits.length - 10)
    const national = digits.slice(-10)
    return `+${cc} ${ten(national)}`
  }
  if (digits.length === 10) {
    return `${hasPlus ? '+' : ''}${ten(digits)}`
  }
  if (digits.length === 11) {
    return `${digits[0]} ${ten(digits.slice(1))}`
  }

  return `${hasPlus ? '+' : ''}${digits}`
}

export function formatContactDisplayName(rawName: string | undefined | null, channel?: string) {
  const name = String(rawName || '').trim()
  if (!name) return ''

  // Prefer to format phone-based placeholders into a nicer phone
  if (isLikelyPhoneText(name)) return formatPhoneForDisplay(name)

  // Some older placeholders like "WhatsApp 123456"
  if (/^whatsapp\s+\d{4,}$/i.test(name)) {
    return channel === 'whatsapp' ? 'WhatsApp' : 'Contacto'
  }

  return name
}

export function getContactAvatarText(displayName: string | undefined | null, channel?: string) {
  const name = String(displayName || '').trim()
  if (!name) return '?' 

  if (isLikelyPhoneText(name) || /^\+\d/.test(name)) {
    const map: Record<string, string> = {
      whatsapp: 'WA',
      facebook: 'FB',
      instagram: 'IG',
    }
    return map[String(channel || '').toLowerCase()] || 'C'
  }

  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
