export const DATE_FORMAT = 'dd/MM/yyyy'

const DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/
const UTC_MIDNIGHT_TAIL_RE = /^T00:00(?::00(?:\.000)?)?Z$/

function toLocalDate(year: string, month: string, day: string): Date {
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function parseApiDateTime(value: string | null | undefined): Date | null {
  if (!value) return null

  const match = value.match(DATE_PREFIX_RE)
  if (match) {
    const tail = value.slice(10)
    if (!tail || UTC_MIDNIGHT_TAIL_RE.test(tail)) {
      return toLocalDate(match[1], match[2], match[3])
    }
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const match = value.match(DATE_PREFIX_RE)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ""
}

export function formatDate(value: string | null | undefined): string {
  const parsed = parseApiDateTime(value)
  return parsed ? parsed.toLocaleDateString() : ""
}
