import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { readSalesSnapshot } from '../services/salesSummary'

const Sales = () => {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total_sales: 0, transactions: 0 })
  const [summaryLoaded, setSummaryLoaded] = useState(false)

  const readSalesSummary = useCallback(async () => {
    return readSalesSnapshot()
  }, [])

  const loadSummary = useCallback(async () => {
    setSummaryLoaded(false)
    try {
      const nextSummary = await readSalesSummary()
      setSummary({
        total_sales: nextSummary.total_sales,
        transactions: nextSummary.transactions,
      })
    } catch (err) {
      console.error(err)
      setSummary({ total_sales: 0, transactions: 0 })
    } finally {
      setSummaryLoaded(true)
    }
  }, [readSalesSummary])

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
    <div className="page landing-page">
      <section className="hero-card landing-hero">
        <div className="hero-copy">
          <div className="auth-badge">Cashier workspace</div>
          <h1 className="hero-title">Record daily sales with a clean, focused interface.</h1>
          <p className="hero-subtitle">Keep the sales total current and visible while you work. This page uses the same visual language as the homepage so the whole system feels consistent.</p>
        </div>

        <div className="hero-showcase">
          <div className="metric-grid landing-metrics">
            <div className="metric-card metric-success">
              <p className="metric-label">Sales total</p>
              <div className="metric-value">{summaryLoaded ? `GHS ${Number.parseFloat(summary.total_sales || 0).toFixed(2)}` : 'Loading...'}</div>
            </div>
            <div className="metric-card metric-accent">
              <p className="metric-label">Transactions</p>
              <div className="metric-value">{summaryLoaded ? summary.transactions : 'Loading...'}</div>
            </div>
          </div>
        </div>
      </section>

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
