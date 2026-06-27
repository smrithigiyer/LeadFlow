// ─── Keys ─────────────────────────────────────────────────────────────────────
const LEADS_KEY         = 'crm_leads'
const FOLLOWUPS_KEY     = 'crm_followups'
const NOTIFICATIONS_KEY = 'crm_notifications'

// ─── Seed data (used only on first load) ──────────────────────────────────────
const SEED_LEADS = [
  {
    id: 1,
    name: 'Arun Kumar',
    email: 'arun@techcorp.com',
    phone: '9876543210',
    company: 'TechCorp Solutions',
    source: 'Website',
    status: 'new',
    notes: 'Interested in enterprise plan. Budget ~5L.',
    created_at: '2026-05-20T09:30:00',
  },
  {
    id: 2,
    name: 'Sathish Venkat',
    email: 'sathish@sunrise.com',
    phone: '9876543290',
    company: 'Sunrise Exports',
    source: 'Referral',
    status: 'contacted',
    notes: 'Called twice. Follow up next week.',
    created_at: '2026-05-18T11:00:00',
  },
  {
    id: 3,
    name: 'Kavitha Ramesh',
    email: 'kavitha@brightstars.in',
    phone: '9988776655',
    company: 'BrightStars Academy',
    source: 'Facebook',
    status: 'meeting_scheduled',
    notes: 'Meeting set for 28 May 3pm.',
    created_at: '2026-05-15T08:45:00',
  },
  {
    id: 4,
    name: 'Deepan Raj',
    email: 'deepan@softwave.io',
    phone: '9123456780',
    company: 'SoftWave Technologies',
    source: 'LinkedIn',
    status: 'converted',
    notes: 'Deal closed. Contract signed.',
    created_at: '2026-05-05T10:00:00',
  },
  {
    id: 5,
    name: 'Meena Selvam',
    email: 'meena@mailme.com',
    phone: '8765432109',
    company: '',
    source: 'Cold Call',
    status: 'lost',
    notes: 'Not ready to invest now.',
    created_at: '2026-05-10T13:30:00',
  },
]

const SEED_FOLLOWUPS = [
  {
    id: 1,
    lead_id: 1,
    customer_name: 'Arun Kumar',
    phone: '9876543210',
    type: 'Call',
    followup_date: '2026-05-26',
    followup_time: '11:00',
    status: 'Pending',
    priority: 'High',
    notes: 'Discuss enterprise plan pricing.',
    assigned_to: 'Priya Sharma',
    created_at: '2026-05-20T09:35:00',
  },
  {
    id: 2,
    lead_id: 2,
    customer_name: 'Sathish Venkat',
    phone: '9876543290',
    type: 'WhatsApp',
    followup_date: '2026-05-27',
    followup_time: '16:30',
    status: 'Pending',
    priority: 'Medium',
    notes: 'Send product brochure.',
    assigned_to: 'Rajan Mehta',
    created_at: '2026-05-19T14:25:00',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null          // key never set — use seed
    return JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — fail silently
  }
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export function getLeads() {
  const stored = readJSON(LEADS_KEY, null)
  if (stored !== null) return stored
  // First time — persist seed and return it
  writeJSON(LEADS_KEY, SEED_LEADS)
  return SEED_LEADS
}

export function saveLeads(leads) {
  writeJSON(LEADS_KEY, leads)
}

// ─── Follow-ups ───────────────────────────────────────────────────────────────
export function getFollowups() {
  const stored = readJSON(FOLLOWUPS_KEY, null)
  if (stored !== null) return stored
  writeJSON(FOLLOWUPS_KEY, SEED_FOLLOWUPS)
  return SEED_FOLLOWUPS
}

export function saveFollowups(followups) {
  writeJSON(FOLLOWUPS_KEY, followups)
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function getNotifications() {
  return readJSON(NOTIFICATIONS_KEY, []) ?? []
}

export function saveNotifications(notifications) {
  writeJSON(NOTIFICATIONS_KEY, notifications)
}

/**
 * Prepend a new notification and persist.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 */
export function addNotification(message, type = 'info') {
  const existing = getNotifications()
  const next = [
    {
      id: Date.now(),
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 100)            
  saveNotifications(next)
  return next
}

export function markNotificationRead(id) {
  const updated = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  )
  saveNotifications(updated)
  return updated
}

export function markAllNotificationsRead() {
  const updated = getNotifications().map((n) => ({ ...n, read: true }))
  saveNotifications(updated)
  return updated
}

export function clearNotifications() {
  saveNotifications([])
  return []
}