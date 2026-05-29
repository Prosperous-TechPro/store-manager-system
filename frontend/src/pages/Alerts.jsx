import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Alerts = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expiryAlerts, setExpiryAlerts] = useState([])
  const [missingAlerts, setMissingAlerts] = useState([])
  const [salesAlerts, setSalesAlerts] = useState([])
  const [salesTotal, setSalesTotal] = useState(0)
  const [selectedMetric, setSelectedMetric] = useState('in_1_month')

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

  const selectedDetails = (() => {
    switch (selectedMetric) {
      case 'sales':
        return {
          title: 'Sales details',
          empty: 'No sales records found.',
          items: salesAlerts.map((sale) => ({
            key: sale.id,
            label: sale.date ? new Date(sale.date).toLocaleString() : `Sale #${sale.id}`,
            meta: `Cashier: ${sale.cashier_name || '-'} | Total amount: ${Number.parseFloat(sale.total_amount || 0).toFixed(2)}`,
            items: Array.isArray(sale.items) ? sale.items : [],
          })),
        }
      case 'expired':
        return {
          title: 'Expired product details',
          empty: 'No expired products found.',
          items: expiredItems.map((item) => ({ key: item.id, label: item.name, meta: `${item.expiry_date ? `Expired on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Expired item'} | Qty: ${item.quantity ?? '-'}` })),
        }
      case 'missing':
        return {
          title: 'Missing product details',
          empty: 'No missing product reports found.',
          items: missingAlerts.map((m) => ({ key: m.id, label: m.product_name || 'Product', meta: `Expected: ${m.expected ?? '-'} | Actual: ${m.actual ?? '-'} | Difference: ${m.difference ?? '-'}` })),
        }
      case 'in_3_months':
      case 'in_2_months':
      case 'in_1_month':
        return {
          title: 'Expiring soon details',
          empty: 'No expiring items found.',
          items: expiryAlerts.filter((it) => it.status === selectedMetric).map((item) => ({ key: item.id, label: item.name, meta: item.expiry_date ? `Expires on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Pending expiry date' })),
        }
      default:
        return { title: 'Details', empty: 'No items found.', items: [] }
    }
  })()

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Management alerts</div>
        <h1 className="hero-title">CEO and manager notifications</h1>
        <p className="hero-subtitle">Track sales activity, expired stock, and missing product reports from one place.</p>

        <div className="metric-grid">
          <button type="button" className={`metric-card metric-success metric-card-button ${selectedMetric === 'sales' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('sales')}>
            <p className="metric-label">Sales total</p>
            <div className="metric-value">{salesTotal.toFixed ? salesTotal.toFixed(2) : salesTotal}</div>
            <p className="section-note">{salesAlerts.length} transactions</p>
          </button>

          <button type="button" className={`metric-card metric-info metric-card-button ${selectedMetric === 'in_3_months' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('in_3_months')}>
            <p className="metric-label">Expiring in 3 months</p>
            <div className="metric-value">{in3.length}</div>
            <p className="section-note">Items expiring in ~90 days</p>
          </button>

          <button type="button" className={`metric-card metric-accent metric-card-button ${selectedMetric === 'in_2_months' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('in_2_months')}>
            <p className="metric-label">Expiring in 2 months</p>
            <div className="metric-value">{in2.length}</div>
            <p className="section-note">Items expiring in ~60 days</p>
          </button>

          <button type="button" className={`metric-card metric-warn metric-card-button ${selectedMetric === 'in_1_month' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('in_1_month')}>
            <p className="metric-label">Expiring in 1 month</p>
            <div className="metric-value">{in1.length}</div>
            <p className="section-note">Items expiring in ~30 days</p>
          </button>

          <button type="button" className={`metric-card metric-danger metric-card-button ${selectedMetric === 'expired' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('expired')}>
            <p className="metric-label">Due / Expired</p>
            <div className="metric-value">{expiredItems.length}</div>
            <p className="section-note">Click to review expired items</p>
          </button>

          <button type="button" className={`metric-card metric-accent metric-card-button ${selectedMetric === 'missing' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('missing')}>
            <p className="metric-label">Missing alerts</p>
            <div className="metric-value">{missingAlerts.length}</div>
            <p className="section-note">Click to review shortage reports</p>
          </button>
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

      {!loading && (
        <section className="panel">
          <h2 className="section-title">{selectedDetails.title}</h2>
          {selectedDetails.items.length ? (
            <ul className="policy-list">
              {selectedDetails.items.map((item) => (
                <li key={item.key}>
                  <strong>{item.label}</strong>
                  <div className="section-note">{item.meta}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-note">{selectedDetails.empty}</p>
          )}
        </section>
      )}
    </div>
  )
}

export default Alerts
