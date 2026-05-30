import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

const Sales = () => {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total_sales: 0, transactions: 0 })

  const loadSummary = useCallback(async () => {
    try {
      const body = await api.get('/sales/summary')
      setSummary({
        total_sales: Number.parseFloat(body?.total_sales || 0),
        transactions: Number.parseInt(body?.transactions || 0, 10),
      })
    } catch (err) {
      console.error(err)
    }
  }, [])

  const broadcastSync = () => {
    const stamp = String(Date.now())
    window.localStorage.setItem('store-sync', stamp)
    window.dispatchEvent(new Event('store-sync'))
  }

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

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
      await loadSummary()
      broadcastSync()
    } catch (err) {
      setError(err.message || 'Failed to record sales')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page static-page">
      <section className="panel" style={{ maxWidth: 640 }}>
        <form onSubmit={submit} className="form-grid">
          <div className="form-field">
            <label>Sales amount (GHS)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          {error && <div className="error-banner">{error}</div>}
          {message && (
            <div className={message.startsWith('Recorded GHS') ? 'success-banner success-banner--black' : 'success-banner'}>{message}</div>
          )}
          <div className="auth-actions">
            <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save sales amount'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Sales
