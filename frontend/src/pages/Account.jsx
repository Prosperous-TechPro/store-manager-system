import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const Account = () => {
  const [role, setRole] = useState('')
  const [initialProfile, setInitialProfile] = useState({ name: '', email: '', phone: '' })
  const [pendingOtpPhone, setPendingOtpPhone] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const user = await api.get('/auth/me')
        setRole(user.role || '')
        setForm(prev => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        }))
        setInitialProfile({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        })
      } catch (err) {
        setError(err.message || 'Failed to load account')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Name, email, and phone are required')
      return
    }
    const detailsChanged = (
      form.name.trim() !== initialProfile.name ||
      form.email.trim() !== initialProfile.email ||
      form.phone.trim() !== initialProfile.phone ||
      Boolean(form.newPassword)
    )
    if (detailsChanged && !form.currentPassword) {
      setError('Current password is required to confirm account changes')
      return
    }
    if (form.newPassword) {
      if (form.newPassword.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setSaving(true)
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
      }
      if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }

      const updated = await api.put('/auth/me', body)
      if (updated.otp_required) {
        setPendingOtpPhone(updated.otp_phone || '')
        setVerificationCode('')
        setMessage(`Enter the verification code sent to ${updated.otp_phone} to confirm your email or phone change.`)
        return
      }
      const user = JSON.parse(localStorage.getItem('user') || 'null') || {}
      const nextUser = {
        ...user,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
      }
      setRole(updated.role || '')
      localStorage.setItem('user', JSON.stringify(nextUser))
      setForm(prev => ({
        ...prev,
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      setInitialProfile({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
      })
      setShowDetails(true)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setMessage(updated.password_updated ? 'Account updated and password saved.' : 'Account updated successfully.')
    } catch (err) {
      setError(err.message || 'Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  const verifyChange = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!verificationCode.trim()) {
      setError('Verification code is required')
      return
    }

    setVerifying(true)
    try {
      const updated = await api.post('/auth/me/verify', { code: verificationCode.trim() })
      const user = JSON.parse(localStorage.getItem('user') || 'null') || {}
      const nextUser = {
        ...user,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
      }
      setRole(updated.role || '')
      localStorage.setItem('user', JSON.stringify(nextUser))
      setInitialProfile({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
      })
      setPendingOtpPhone('')
      setVerificationCode('')
      setForm(prev => ({
        ...prev,
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      setShowDetails(true)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setMessage('Account change verified and saved.')
    } catch (err) {
      setError(err.message || 'Failed to verify account change')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <div className="auth-badge">My account</div>
          <h1 className="hero-title" style={{ fontSize: '2.1rem', marginTop: 6 }}>Update your details</h1>
          <p className="hero-subtitle">Edit your name, email, phone, and password from one secure screen.</p>
        </div>
        <div className="section-actions">
          <Link className="button-secondary" to="/dashboard">Back to dashboard</Link>
        </div>
      </section>

      <div className="auth-card" style={{ width: '100%' }}>
        {loading ? (
          <div className="loading-state">Loading account...</div>
        ) : (
          <div className="account-grid">
            <button
              type="button"
              className="account-summary"
              onClick={() => setShowDetails((value) => !value)}
              aria-expanded={showDetails}
            >
              <span>Full name: {form.name || '-'}</span>
              <span>Email: {form.email || '-'}</span>
              <span>Role: {role || 'casher'}</span>
            </button>

            {showDetails && (
              <form onSubmit={submit} className="form-grid">
                <div className="form-field">
                  <label>Full name</label>
                  <input value={form.name} onChange={(e) => change('name', e.target.value)} disabled={saving} />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => change('email', e.target.value)} disabled={saving} />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => change('phone', e.target.value)} disabled={saving} placeholder="e.g. 0241234567 or +233241234567" />
                </div>
                <div className="form-field">
                  <label>Role</label>
                  <span className="tag tag-role" style={{ width: 'fit-content' }} title="Your role">Role: {role || 'casher'}</span>
                </div>
                <div className="form-field">
                  <label>Current password</label>
                  <input type="password" value={form.currentPassword} onChange={(e) => change('currentPassword', e.target.value)} disabled={saving} placeholder="Required to save any changes" />
                </div>
                <div className="form-field">
                  <label>New password</label>
                  <div className="password-field">
                    <input type={showPassword ? 'text' : 'password'} value={form.newPassword} onChange={(e) => change('newPassword', e.target.value)} disabled={saving} minLength={8} placeholder="8 characters or more" />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} disabled={saving} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>Confirm new password</label>
                  <div className="password-field">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => change('confirmPassword', e.target.value)} disabled={saving} minLength={8} placeholder="Repeat new password" />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)} disabled={saving} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                      {showConfirmPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {message && <div className="success-banner">{message}</div>}
                {error && <div className="error-banner">{error}</div>}

                <div className="auth-actions">
                  <button className="button-secondary" type="button" onClick={() => setShowDetails(false)} disabled={saving}>Hide details</button>
                  <button className="button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </form>
            )}
          </div>
        )}

        {pendingOtpPhone && (
          <form onSubmit={verifyChange} className="form-grid" style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="form-field">
              <label>Verification code</label>
              <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} disabled={verifying} placeholder="Enter the OTP sent to your phone" />
            </div>
            <div className="section-note">Code sent to {pendingOtpPhone}</div>
            <div className="auth-actions">
              <button className="button-primary" type="submit" disabled={verifying}>{verifying ? 'Verifying...' : 'Verify and save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Account