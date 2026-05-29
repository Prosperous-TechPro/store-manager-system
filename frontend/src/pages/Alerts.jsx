import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Alerts = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expiryAlerts, setExpiryAlerts] = useState([])
  const [missingAlerts, setMissingAlerts] = useState([])
  const [salesTotal, setSalesTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [sales, expiry, missing] = await Promise.all([
          api.get('/sales'),
          api.get('/reports/expiry'),
          api.get('/reports/missing'),
        ])
        setSalesTotal(sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0))
        setExpiryAlerts(Array.isArray(expiry) ? expiry : [])
        setMissingAlerts(Array.isArray(missing) ? missing : [])
      } catch (err) {
        setError(err.message || 'Failed to load alerts')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const expiredItems = expiryAlerts.filter((item) => item.status === 'expired')
  const warningItems = expiryAlerts.filter((item) => item.status !== 'expired' && item.status !== 'ok')

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Management alerts</div>
        <h1 className="hero-title">CEO and manager notifications</h1>
        <p className="hero-subtitle">Track sales activity, expired stock, and missing product reports from one place.</p>
        <div className="metric-grid">
          <div className="metric-card metric-success">
            <p className="metric-label">Sales total</p>
            <div className="metric-value">{salesTotal.toFixed ? salesTotal.toFixed(2) : salesTotal}</div>
          </div>
          <div className="metric-card metric-warn">
            <p className="metric-label">Expired products</p>
            <div className="metric-value">{expiredItems.length}</div>
          </div>
          <div className="metric-card metric-accent">
            <p className="metric-label">Missing product alerts</p>
            <div className="metric-value">{missingAlerts.length}</div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="loading-state">Loading alerts...</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : (
        <div className="grid-2">
          <section className="panel">
            <h2 className="section-title">Expired products</h2>
            {expiredItems.length ? (
              <ul className="policy-list">
                {expiredItems.map((item) => (
                  <li key={item.id}>{item.name} is expired and should be removed from active stock.</li>
                ))}
              </ul>
            ) : (
              <p className="section-note">No expired products found.</p>
            )}
          </section>

          <section className="panel">
            <h2 className="section-title">Missing product reports</h2>
            {missingAlerts.length ? (
              <ul className="policy-list">
                {missingAlerts.map((item) => (
                  <li key={item.id}>{item.product_name || 'Product'} reported missing.</li>
                ))}
              </ul>
            ) : (
              <p className="section-note">No missing product reports found.</p>
            )}
          </section>
        </div>
      )}

      {!loading && warningItems.length > 0 && (
        <section className="panel">
          <h2 className="section-title">Expiring soon</h2>
          <ul className="policy-list">
            {warningItems.map((item) => (
              <li key={item.id}>{item.name} expires on {item.expiry_date}.</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default Alerts