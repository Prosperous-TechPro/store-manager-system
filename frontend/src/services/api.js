const isLocalDev = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const resolveApiBase = () => {
  const configuredBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || ''

  if (configuredBase) {
    const normalized = configuredBase.replace(/\/$/, '')
    if (!isLocalDev && typeof window !== 'undefined' && normalized === window.location.origin) {
      return `${normalized}/api`
    }
    return normalized
  }

  if (typeof window !== 'undefined' && !isLocalDev) {
    return `${window.location.origin}/api`
  }

  return 'http://localhost:4000/api'
}

const API_BASE = resolveApiBase()

const headers = (hasBody = true) => {
  const h = {}
  if (hasBody) h['Content-Type'] = 'application/json'
  const token = localStorage.getItem('token')
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

const handle = async (res) => {
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const body = await res.json()
      const error = new Error(body.error || JSON.stringify(body))
      error.status = res.status
      error.data = body
      throw error
    }
    const text = await res.text()
    if (text.includes('NOT_FOUND') && API_BASE.includes('vercel.app')) {
      const error = new Error('API request hit the frontend host. Set VITE_API_URL to your backend base URL.')
      error.status = res.status
      throw error
    }
    const error = new Error(text || 'Request failed')
    error.status = res.status
    throw error
  }
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

export default {
  get: (path) => fetch(`${API_BASE}${path}`, { headers: headers(false) }).then(handle),
  post: (path, body) => fetch(`${API_BASE}${path}`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) }).then(handle),
  put: (path, body) => fetch(`${API_BASE}${path}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }).then(handle),
  del: (path, body) => fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers(Boolean(body)), body: body ? JSON.stringify(body) : undefined }).then(handle),
}
