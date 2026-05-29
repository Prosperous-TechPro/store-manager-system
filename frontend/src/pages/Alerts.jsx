import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const Alerts = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expiryAlerts, setExpiryAlerts] = useState([])
  const [missingAlerts, setMissingAlerts] = useState([])
  const [salesAlerts, setSalesAlerts] = useState([])
  const [salesTotal, setSalesTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [sales, expiry, missing] = await Promise.all([
          api.get('/sales/details'),
          api.get('/reports/expiry'),
          api.get('/reports/missing'),
        ])
        setSalesAlerts(Array.isArray(sales) ? sales : [])
        setSalesTotal((Array.isArray(sales) ? sales : []).reduce((sum, s) => sum + Number.parseFloat(s.total_amount || 0), 0))
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

  const expiredItems = expiryAlerts.filter((it) => it.status === 'expired')
  const in3 = expiryAlerts.filter((it) => it.status === 'in_3_months')
  const in2 = expiryAlerts.filter((it) => it.status === 'in_2_months')
  const in1 = expiryAlerts.filter((it) => it.status === 'in_1_month')

  const metricCards = [
    {
      key: 'sales',
      label: 'Sales total',
      value: salesTotal.toFixed ? salesTotal.toFixed(2) : salesTotal,
      note: `${salesAlerts.length} transactions`,
      theme: 'metric-success',
    },
    {
      key: 'in_3_months',
      label: 'Expiring in 3 months',
      value: in3.length,
      note: 'Items expiring in ~90 days',
      theme: 'metric-info',
    },
    {
      key: 'in_2_months',
      label: 'Expiring in 2 months',
      value: in2.length,
      note: 'Items expiring in ~60 days',
      theme: 'metric-accent',
    },
    {
      key: 'in_1_month',
      label: 'Expiring in 1 month',
      value: in1.length,
      note: 'Items expiring in ~30 days',
      theme: 'metric-warn',
    },
    {
      key: 'expired',
      label: 'Due / Expired',
      value: expiredItems.length,
      note: 'Click to review expired items',
      theme: 'metric-danger',
    },
    {
      key: 'missing',
      label: 'Missing alerts',
      value: missingAlerts.length,
      note: 'Click to review shortage reports',
      theme: 'metric-accent',
    },
  ]

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Management alerts</div>
        <h1 className="hero-title">CEO and manager notifications</h1>
        <p className="hero-subtitle">Track sales activity, expired stock, and missing product reports from one place.</p>

        <div className="metric-grid">
          {metricCards.map((metric) => (
            <Link key={metric.key} to={`/alerts/${metric.key}`} className={`metric-card metric-card-link ${metric.theme}`}>
              <p className="metric-label">{metric.label}</p>
              <div className="metric-value">{metric.value}</div>
              <span className="metric-link-hint">{metric.note}</span>
            </Link>
          ))}
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
                {missingAlerts.map((m) => (
                  <li key={m.id}>{m.product_name || 'Product'} reported missing.</li>
                ))}
              </ul>
            ) : (
              <p className="section-note">No missing product reports found.</p>
            )}
          </section>
        </div>
      )}

    </div>
  )
}

export default Alerts
