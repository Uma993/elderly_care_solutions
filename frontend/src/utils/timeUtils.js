/**
 * Parse time string (e.g. "17:00", "5:00 PM") to minutes since midnight.
 * Returns -1 if unparseable.
 */
export function parseTimeToMinutes(str) {
  if (!str || typeof str !== 'string') return -1;
  const t = str.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const m12 = t.match(/^(\d{1,2})\s*(am|pm)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    if (m12[2].toLowerCase() === 'pm' && h < 12) h += 12;
    if (m12[2].toLowerCase() === 'am' && h === 12) h = 0;
    return h * 60;
  }
  return -1;
}
