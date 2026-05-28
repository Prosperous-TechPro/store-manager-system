import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const Login = () => {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('casher')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (mode === 'login') {
      if (!email || !password) return setError('Email and password are required')
    } else {
      if (!name || !email || !password) return setError('Name, email, and password are required')
      if (password !== confirmPassword) return setError('Passwords do not match')
      if (!policyAccepted) return setError('Please accept the store policy to continue')
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const body = await api.post('/auth/login', { email, password })
        localStorage.setItem('token', body.token)
        localStorage.setItem('user', JSON.stringify(body.user))
        window.location.href = '/dashboard'
      } else {
        await api.post('/auth/register', { name, email, password, phone: phone.trim() || undefined, role })
        setSuccess('Account created successfully. You can now sign in.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setPolicyAccepted(false)
      }
    } catch (err) {
      setError(err.message || (mode === 'login' ? 'Login failed' : 'Account creation failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap page">
      <div className="auth-card">
        <div className="auth-badge">{mode === 'login' ? 'Welcome back' : 'Create your account'}</div>
        <h1 className="hero-title">{mode === 'login' ? 'Sign in to your dashboard' : 'Create a new store account'}</h1>
        <p className="hero-subtitle">
          {mode === 'login'
            ? 'Manage products, sales, and stock with a clean modern workspace.'
            : 'Set up a store user account in seconds with Cashier, Manager, Sales Associate, or Owner access.'}
        </p>
        <form onSubmit={submit} className="form-grid" style={{ marginTop: 20 }}>
          {mode === 'register' && (
            <div className="form-field">
              <label>Full name</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} disabled={loading} />
            </div>
          )}
          <div className="form-field">
            <label>Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} disabled={loading} />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} disabled={loading} />
          </div>
          {mode === 'register' && (
            <>
              <div className="form-field">
                <label>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="form-field">
                <label>Phone number <span className="helper-text">Optional</span></label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} disabled={loading} />
              </div>
              <div className="form-field">
                <label>Role</label>
                <select className="role-select" value={role} onChange={(e)=>setRole(e.target.value)} disabled={loading}>
                  <option value="casher">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="saler">Sales Associate</option>
                  <option value="owner">Owner</option>
                </select>
                <div className="helper-text">Choose the role that matches the user’s job function and access level.</div>
              </div>
            </>
          )}
          {success && <div className="success-banner">{success}</div>}
          {error && <div className="error-banner">{error}</div>}
          <div className="auth-actions">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Login' : 'Create account')}
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                setError(null)
                setSuccess(null)
                setMode(mode === 'login' ? 'register' : 'login')
                if (mode === 'login') setRole('casher')
                if (mode === 'login') setPolicyAccepted(false)
              }}
              disabled={loading}
            >
              {mode === 'login' ? 'Create account' : 'Back to login'}
            </button>
          </div>
          {mode === 'register' && (
            <label className="policy-check">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                disabled={loading}
              />
              <span>
                I accept the <Link to="/policy">store policy for Ghana</Link> and understand role access rules.
              </span>
            </label>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login
