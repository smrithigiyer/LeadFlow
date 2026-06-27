import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach auth token ────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: normalize errors + handle 401 ──────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Something went wrong'
    err.friendlyMessage = message

    // Auto-redirect on token expiry (skip the login route itself)
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

// ── Auth endpoints ────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post('/auth/login', data),
  getMe:          ()     => api.get('/auth/me'),
  register:       (data) => api.post('/auth/register', data),
  updateProfile:  (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
}

// ── Public endpoints (no auth) ────────────────────────────────
export const publicApi = {
  submitEnquiry: (data) => api.post('/public/leads', data),
}

// ── Lead endpoints ────────────────────────────────────────────
export const leadApi = {
  getAll:       (params)     => api.get('/leads', { params }),
  getById:      (id)         => api.get(`/leads/${id}`),
  create:       (data)       => api.post('/leads', data),
  update:       (id, data)   => api.put(`/leads/${id}`, data),
  updateStatus: (id, status) => api.patch(`/leads/${id}/status`, { status }),
  delete:       (id)         => api.delete(`/leads/${id}`),
  getStats:     ()           => api.get('/leads/stats'),
  bulk:         (data)       => api.patch('/leads/bulk', data),
  exportCSV:    (params)     => api.get('/leads/export', { params, responseType: 'blob' }),
  importCSV:    (file, sendWelcome = false) => {
    const fd = new FormData()
    fd.append('file', file)
    if (sendWelcome) fd.append('sendWelcome', 'true')
    return api.post('/leads/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── User endpoints (admin only) ───────────────────────────────
export const userApi = {
  getAll:       ()           => api.get('/users'),
  create:       (data)       => api.post('/users', data),
  update:       (id, data)   => api.put(`/users/${id}`, data),
  toggleStatus: (id)         => api.patch(`/users/${id}/status`),
  delete:       (id)         => api.delete(`/users/${id}`),
}

// ── Follow-up endpoints ───────────────────────────────────────
export const followUpApi = {
  getAll:         (params)          => api.get('/followups', { params }),
  bulk:           (data)            => api.patch('/followups/bulk', data),
  getByLead:      (leadId)          => api.get(`/leads/${leadId}/followups`),
  createForLead:  (leadId, data)    => api.post(`/leads/${leadId}/followups`, data),
  update:         (id, data)        => api.put(`/followups/${id}`, data),
  updateOutcome:  (id, outcome)     => api.patch(`/followups/${id}/outcome`, { outcome }),
  delete:         (id)              => api.delete(`/followups/${id}`),
}

// ── Notes endpoints ───────────────────────────────────────────
export const notesApi = {
  getByLead:        (leadId)          => api.get(`/leads/${leadId}/notes`),
  create:           (leadId, content) => api.post(`/leads/${leadId}/notes`, { content }),
  getByFollowup:    (followupId)          => api.get(`/followups/${followupId}/notes`),
  createForFollowup:(followupId, content) => api.post(`/followups/${followupId}/notes`, { content }),
  update:           (id, content)     => api.put(`/notes/${id}`, { content }),
  delete:           (id)              => api.delete(`/notes/${id}`),
}

// ── Activity endpoints ────────────────────────────────────────
export const activityApi = {
  getByLead: (leadId) => api.get(`/leads/${leadId}/activities`),
}

// ── Email endpoints ───────────────────────────────────────────
export const emailApi = {
  send:         (leadId, data) => api.post(`/leads/${leadId}/email`, data),
  getByLead:    (leadId)       => api.get(`/leads/${leadId}/email`),
  bulkWelcome:  ()             => api.post('/leads/email/welcome/bulk'),
}

// ── Customer endpoints ────────────────────────────────────────
export const customerApi = {
  getAll:   (params)       => api.get('/customers',        { params }),
  getStats: ()             => api.get('/customers/stats'),
  getById:  (id)           => api.get(`/customers/${id}`),
  update:   (id, data)     => api.patch(`/customers/${id}`, data),
}

// ── Lost Leads endpoints ──────────────────────────────────────
export const lostLeadsApi = {
  getAll:      (params) => api.get('/lost-leads',                  { params }),
  getStats:    ()       => api.get('/lost-leads/stats'),
  reactivate:  (id)     => api.patch(`/lost-leads/${id}/reactivate`),
  updateInfo:  (id, data) => api.patch(`/lost-leads/${id}/info`, data),
}

export default api