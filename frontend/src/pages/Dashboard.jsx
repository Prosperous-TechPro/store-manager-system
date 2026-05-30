import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { readSalesSnapshot } from '../services/salesSummary'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const role = user?.role === 'owner' ? 'ceo' : user?.role
  const isCashier = role === 'casher'
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalProducts:0, totalQuantity:0, lowStock:0, salesTotal:0, transactions:0, expiredProducts:0, missingProducts:0 })

  const metricCards = isCashier
    ? [
      { key: 'sales-total', label: 'Sales total', value: metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal, theme: 'metric-success', to: '/dashboard/sales-total' },
      { key: 'sales-total-transactions', label: 'Transactions', value: metrics.transactions, theme: 'metric-accent' },
    ]
    : [
      { key: 'total-products', label: 'Total products', value: metrics.totalProducts, theme: 'metric-accent', to: '/dashboard/total-products' },
      { key: 'total-quantity', label: 'Total quantity', value: metrics.totalQuantity, theme: 'metric-accent', to: '/dashboard/total-quantity' },
      { key: 'low-stock', label: 'Low stock items', value: metrics.lowStock, theme: 'metric-warn', to: '/dashboard/low-stock' },
      { key: 'sales-total', label: 'Sales total', value: metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal, theme: 'metric-success', to: '/dashboard/sales-total' },
      { key: 'expired-products', label: 'Expired products', value: metrics.expiredProducts, theme: 'metric-warn', to: '/dashboard/expired-products' },
      { key: 'missing-products', label: 'Missing product alerts', value: metrics.missingProducts, theme: 'metric-accent', to: '/dashboard/missing-products' },
    ]

  const load = useCallback(async ()=>{
    setLoading(true)
    try{
      if (isCashier) {
        const { total_sales: salesTotal, transactions } = await readSalesSnapshot()
        setMetrics({ totalProducts: 0, totalQuantity: 0, lowStock: 0, salesTotal, transactions, expiredProducts: 0, missingProducts: 0 })
        return
      }

      const [productsResult, salesSnapshotResult, expiryResult, missingResult] = await Promise.allSettled([
        api.get('/products'),
        readSalesSnapshot(),
        api.get('/reports/expiry'),
        api.get('/reports/missing'),
      ])
      const products = productsResult.status === 'fulfilled' && Array.isArray(productsResult.value) ? productsResult.value : []
      const salesSnapshot = salesSnapshotResult.status === 'fulfilled' ? salesSnapshotResult.value : { total_sales: 0, transactions: 0 }
      const expiry = expiryResult.status === 'fulfilled' && Array.isArray(expiryResult.value) ? expiryResult.value : []
      const missing = missingResult.status === 'fulfilled' && Array.isArray(missingResult.value) ? missingResult.value : []
      const totalProducts = products.length
      const totalQuantity = products.reduce((s,p)=>s + (p.quantity||0), 0)
      const lowStock = products.filter(p=> (p.reorder_level || 0) >= (p.quantity || 0)).length
      const salesTotal = Number.parseFloat(salesSnapshot.total_sales || 0)
      const transactions = Number.parseInt(salesSnapshot.transactions || 0, 10)
      const expiredProducts = expiry.filter((item) => item.status === 'expired').length
      const missingProducts = missing.length
      setMetrics({ totalProducts, totalQuantity, lowStock, salesTotal, transactions, expiredProducts, missingProducts })
    }catch(e){
      console.error(e)
    }finally{ setLoading(false) }
  },[isCashier])

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
            <p className="hero-subtitle">{isCashier ? 'Your live sales total updates as sales are recorded.' : 'A fast snapshot of stock, sales, and movement across the store. Click any metric to open its detail page.'}</p>
          </div>
          <div className="nav-chip">Transactions {metrics.transactions}</div>
        </div>

        <div className="metric-grid">
          {metricCards.map((metric) => (
            metric.to ? (
              <Link key={metric.key} to={metric.to} className={`metric-card metric-card-link ${metric.theme}`}>
                <p className="metric-label">{metric.label}</p>
                <div className="metric-value">{metric.value}</div>
                <span className="metric-link-hint">View details</span>
              </Link>
            ) : (
              <div key={metric.key} className={`metric-card ${metric.theme}`}>
                <p className="metric-label">{metric.label}</p>
                <div className="metric-value">{metric.value}</div>
              </div>
            )
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
