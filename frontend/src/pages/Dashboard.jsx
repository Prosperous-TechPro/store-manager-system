import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalProducts:0, totalQuantity:0, lowStock:0, salesTotal:0, transactions:0 })

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true)
      try{
        const [products, sales] = await Promise.all([api.get('/products'), api.get('/sales')])
        const totalProducts = products.length
        const totalQuantity = products.reduce((s,p)=>s + (p.quantity||0), 0)
        const lowStock = products.filter(p=> (p.reorder_level || 0) >= (p.quantity || 0)).length
        const salesTotal = sales.reduce((s,x)=> s + parseFloat(x.total_amount || 0), 0)
        const transactions = sales.length
        setMetrics({ totalProducts, totalQuantity, lowStock, salesTotal, transactions })
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  if (loading) return <div style={{padding:20}}>Loading dashboard...</div>

  return (
    <div className="page">
      <section className="hero-card">
        <div className="auth-badge">Live overview</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">Dashboard</h1>
            <p className="hero-subtitle">A fast snapshot of stock, sales, and movement across the store.</p>
          </div>
          <div className="nav-chip">Transactions {metrics.transactions}</div>
        </div>

        <div className="metric-grid">
          <div className="metric-card metric-accent">
            <p className="metric-label">Total products</p>
            <div className="metric-value">{metrics.totalProducts}</div>
          </div>
          <div className="metric-card">
            <p className="metric-label">Total quantity</p>
            <div className="metric-value">{metrics.totalQuantity}</div>
          </div>
          <div className="metric-card metric-warn">
            <p className="metric-label">Low stock items</p>
            <div className="metric-value">{metrics.lowStock}</div>
          </div>
          <div className="metric-card metric-success">
            <p className="metric-label">Sales total</p>
            <div className="metric-value">{metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
