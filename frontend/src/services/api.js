const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
      throw new Error(body.error || JSON.stringify(body))
    }
    const text = await res.text()
    throw new Error(text || 'Request failed')
  }
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

export default {
  get: (path) => fetch(`${API_BASE}${path}`, { headers: headers(false) }).then(handle),
  post: (path, body) => fetch(`${API_BASE}${path}`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) }).then(handle),
  put: (path, body) => fetch(`${API_BASE}${path}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }).then(handle),
  del: (path) => fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers(false) }).then(handle),
}
