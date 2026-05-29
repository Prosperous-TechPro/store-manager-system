import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const VerifyAccount = () => {
  const [searchParams] = useSearchParams()
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const hint = useMemo(() => {
    if (phone) return `We sent a 6-digit code to ${phone}.`
    return 'Enter the phone number used during registration and the 6-digit code you received.'
  }, [phone])

  const sendCode = async () => {
    setError(null)
    setMessage(null)
    if (!phone) return setError('Phone number is required')
    setLoading(true)
    try {
      await api.post('/sms/send', { phone, purpose: 'signup' })
      setMessage('Verification code sent successfully.')
    } catch (err) {
      setError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!phone || !code) return setError('Phone number and verification code are required')
    setLoading(true)
    try {
      const body = await api.post('/auth/verify-phone', { phone, code })
      if (body?.token && body?.user) {
        localStorage.setItem('token', body.token)
        localStorage.setItem('user', JSON.stringify(body.user))
        window.location.href = '/dashboard'
        return
      }
      setMessage('Account verified. It still needs manager or CEO approval before you can sign in.')
    } catch (err) {
      if (err.status === 403 && err.data?.approval_required) {
        setMessage('Phone verified. Your account is now waiting for manager or CEO approval.')
        return
      }
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap page">
      <div className="auth-card">
        <div className="auth-badge">Verify account</div>
        <h1 className="hero-title">Confirm your phone number before signing in</h1>
        <p className="hero-subtitle">{hint}</p>
        <form onSubmit={submit} className="form-grid" style={{ marginTop: 20 }}>
          <div className="form-field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="you@example.com" />
          </div>
          <div className="form-field">
            <label>Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} placeholder="0240000000" />
          </div>
          <div className="form-field">
            <label>Verification code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} placeholder="6-digit code" />
          </div>
          {message && <div className="success-banner">{message}</div>}
          {error && <div className="error-banner">{error}</div>}
          <div className="auth-actions">
            <button className="button-primary" type="submit" disabled={loading}>Verify account</button>
            <button className="button-secondary" type="button" onClick={sendCode} disabled={loading || !phone}>Resend code</button>
          </div>
          <div className="auth-links">
            <Link to="/login">Back to login</Link>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VerifyAccount