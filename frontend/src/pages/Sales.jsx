import React, { useState } from 'react'
import api from '../services/api'

const Sales = () => {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const saleAmount = Number.parseFloat(amount)
    if (!Number.isFinite(saleAmount) || saleAmount < 0) {
      setError('Enter a valid sales amount')
      return
    }

    setSaving(true)
    try {
      await api.post('/sales', { amount: saleAmount })
      setMessage(`Recorded GHS ${saleAmount.toFixed(2)} in sales.`)
      setAmount('')
    } catch (err) {
      setError(err.message || 'Failed to record sales')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Sales entry</div>
        <h1 className="hero-title">Record sales amount</h1>
        <p className="hero-subtitle">Cashiers can enter the total sales amount after checkout. Managers can use the same screen too.</p>
      </section>

      <section className="panel" style={{ maxWidth: 640 }}>
        <form onSubmit={submit} className="form-grid">
          <div className="form-field">
            <label>Sales amount (GHS)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          {error && <div className="error-banner">{error}</div>}
          {message && <div className="success-banner">{message}</div>}
          <div className="auth-actions">
            <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save sales amount'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Sales
