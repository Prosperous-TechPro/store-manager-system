import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const VerifyAccount = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [smsStatus, setSmsStatus] = useState(searchParams.get('sms') || '')
  const [code, setCode] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const autoSentRef = useRef(false)

  const hint = useMemo(() => {
    if (smsStatus === 'failed') {
      return 'Your account was created, but the SMS could not be sent. Try resending the code after the provider is fixed.'
    }
    if (phone) return `We sent a verification message to ${phone}.`
    return 'Enter the phone number used during registration. We will send a verification message by SMS.'
  }, [phone, smsStatus])

  useEffect(() => {
    if (!phone || autoSentRef.current) return
    autoSentRef.current = true
    sendCode()
  }, [phone])

  const sendCode = async (forceResend = false) => {
    setError(null)
    setMessage(null)
    if (!phone) return setError('Phone number is required')
    setLoading(true)
    try {
      await api.post('/sms/send', { phone, purpose: 'signup', forceResend })
      // do not show a success banner; open the code input so users can enter a code
      setShowCodeInput(true)
    } catch (err) {
      setError(err.message || 'Failed to send verification message')
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

      if (body && body.account_exists === false) {
        // phone verified but no account: redirect to registration with prefilled phone/email
        navigate(`/login?mode=register&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`)
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
          {!showCodeInput ? (
            <div className="helper-text">
              Enter your phone number and we will send a verification message by SMS. Use the code from your phone to continue.
            </div>
          ) : (
            <div className="form-field">
              <label>Verification code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} placeholder="6-digit code" />
            </div>
          )}
          {message && <div className="success-banner">{message}</div>}
          {error && <div className="error-banner">{error}</div>}
          <div className="auth-actions">
            <button className="button-primary" type="submit" disabled={loading || !showCodeInput}>Verify account</button>
            <button className="button-secondary" type="button" onClick={() => sendCode(true)} disabled={loading || !phone}>Resend code</button>
          </div>
          <div className="auth-links">
            <Link to="/login" className="button-secondary">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VerifyAccount