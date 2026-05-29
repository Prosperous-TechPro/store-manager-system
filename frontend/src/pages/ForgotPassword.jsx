import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const ForgotPassword = () => {
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const requestReset = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!email) return setError('Email is required')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setMessage('We sent a reset code to the phone number on the account. Enter the code and choose a new password below.')
      setStep('reset')
    } catch (err) {
      setError(err.message || 'Failed to request password reset')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!code || !newPassword) return setError('Reset code and new password are required')
    if (newPassword.length < 8) return setError('Password must be at least 8 characters long')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      const body = await api.post('/auth/reset-password', { email, code, newPassword })
      if (body?.token && body?.user) {
        localStorage.setItem('token', body.token)
        localStorage.setItem('user', JSON.stringify(body.user))
        window.location.href = '/dashboard'
        return
      }
      setMessage('Password updated successfully. You can sign in now.')
      setStep('done')
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap page">
      <div className="auth-card">
        <div className="auth-badge">Recover password</div>
        <h1 className="hero-title">Reset your account password</h1>
        <p className="hero-subtitle">We send a reset code to the phone number linked to your account.</p>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}
        {step === 'request' && (
          <form onSubmit={requestReset} className="form-grid" style={{ marginTop: 20 }}>
            <div className="form-field">
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="you@example.com" />
            </div>
            <div className="auth-actions">
              <button className="button-primary" type="submit" disabled={loading}>Send reset code</button>
              <button className="button-secondary" type="button" onClick={() => setStep('reset')} disabled={loading}>I have a reset code</button>
              <Link className="button-secondary" to="/login">Back to login</Link>
            </div>
          </form>
        )}
        {step !== 'request' && (
          <form onSubmit={resetPassword} className="form-grid" style={{ marginTop: 20 }}>
            <div className="form-field">
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="form-field">
              <label>Reset code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} placeholder="6-digit code" />
            </div>
            <div className="form-field">
              <label>New password</label>
              <div className="password-field">
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} minLength={8} />
                <button type="button" className="password-toggle" onClick={() => setShowNewPassword((value) => !value)} disabled={loading} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                  {showNewPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label>Confirm new password</label>
              <div className="password-field">
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} minLength={8} />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)} disabled={loading} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirmPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="auth-actions">
              <button className="button-primary" type="submit" disabled={loading}>Reset password</button>
              <Link className="button-secondary" to="/login">Back to login</Link>
            </div>
            <div className="auth-links">
              <button type="button" className="button-secondary" onClick={() => setStep('request')} disabled={loading}>Request a new code</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword