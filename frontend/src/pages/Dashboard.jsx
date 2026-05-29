import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalProducts:0, totalQuantity:0, lowStock:0, salesTotal:0, transactions:0, expiredProducts:0, missingProducts:0 })

  const metricCards = [
    { key: 'total-products', label: 'Total products', value: metrics.totalProducts, theme: 'metric-accent' },
    { key: 'total-quantity', label: 'Total quantity', value: metrics.totalQuantity, theme: 'metric-accent' },
    { key: 'low-stock', label: 'Low stock items', value: metrics.lowStock, theme: 'metric-warn' },
    { key: 'sales-total', label: 'Sales total', value: metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal, theme: 'metric-success' },
    { key: 'expired-products', label: 'Expired products', value: metrics.expiredProducts, theme: 'metric-warn' },
    { key: 'missing-products', label: 'Missing product alerts', value: metrics.missingProducts, theme: 'metric-accent' },
  ]

  const load = useCallback(async ()=>{
    setLoading(true)
    try{
      const [products, sales, expiry, missing] = await Promise.all([
        api.get('/products'),
        api.get('/sales'),
        api.get('/reports/expiry'),
        api.get('/reports/missing'),
      ])
      const totalProducts = products.length
      const totalQuantity = products.reduce((s,p)=>s + (p.quantity||0), 0)
      const lowStock = products.filter(p=> (p.reorder_level || 0) >= (p.quantity || 0)).length
      const salesTotal = sales.reduce((s,x)=> s + parseFloat(x.total_amount || 0), 0)
      const transactions = sales.length
      const expiredProducts = Array.isArray(expiry) ? expiry.filter((item) => item.status === 'expired').length : 0
      const missingProducts = Array.isArray(missing) ? missing.length : 0
      setMetrics({ totalProducts, totalQuantity, lowStock, salesTotal, transactions, expiredProducts, missingProducts })
    }catch(e){
      console.error(e)
    }finally{ setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])
  useSyncRefresh(load)

  if (loading) return <div style={{padding:20}}>Loading dashboard...</div>

  return (
    <div className="page">
      <section className="hero-card">
        <div className="auth-badge">Live overview</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">Dashboard</h1>
            <p className="hero-subtitle">A fast snapshot of stock, sales, and movement across the store. Click any metric to open its detail page.</p>
          </div>
          <div className="nav-chip">Transactions {metrics.transactions}</div>
        </div>

        <div className="metric-grid">
          {metricCards.map((metric) => (
            <Link key={metric.key} to={`/dashboard/${metric.key}`} className={`metric-card metric-card-link ${metric.theme}`}>
              <p className="metric-label">{metric.label}</p>
              <div className="metric-value">{metric.value}</div>
              <span className="metric-link-hint">View details</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
