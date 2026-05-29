import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalProducts:0, totalQuantity:0, lowStock:0, salesTotal:0, transactions:0, expiredProducts:0, missingProducts:0 })
  const [selectedMetric, setSelectedMetric] = useState('totalProducts')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [expiryAlerts, setExpiryAlerts] = useState([])
  const [missingAlerts, setMissingAlerts] = useState([])

  useEffect(()=>{
    const load = async ()=>{
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
        setProducts(Array.isArray(products) ? products : [])
        setSales(Array.isArray(sales) ? sales : [])
        setExpiryAlerts(Array.isArray(expiry) ? expiry : [])
        setMissingAlerts(Array.isArray(missing) ? missing : [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  const expiredItems = expiryAlerts.filter((item) => item.status === 'expired')
  const lowStockItems = products.filter((item) => (item.reorder_level || 0) >= (item.quantity || 0))

  const selectedDetails = (() => {
    switch (selectedMetric) {
      case 'totalQuantity':
        return {
          title: 'Total quantity details',
          empty: 'No product quantities found.',
          summary: `Across ${metrics.totalProducts} products, the store currently holds ${metrics.totalQuantity} units.`,
          items: products
            .slice()
            .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
            .map((item) => ({
              key: item.id,
              label: item.name,
              meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Price: ${Number.parseFloat(item.price || 0).toFixed(2)}`,
            })),
        }
      case 'lowStock':
        return {
          title: 'Low stock details',
          empty: 'No low stock items found.',
          summary: `There are ${metrics.lowStock} products at or below their reorder level.`,
          items: lowStockItems.map((item) => ({
            key: item.id,
            label: item.name,
            meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Category: ${item.category || '-'}`,
          })),
        }
      case 'salesTotal':
        return {
          title: 'Sales details',
          empty: 'No sales records found.',
          summary: `There are ${metrics.transactions} sales transactions totaling ${metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal}.`,
          items: sales.map((sale) => ({
            key: sale.id,
            label: sale.date ? new Date(sale.date).toLocaleString() : `Sale #${sale.id}`,
            meta: `Cashier: ${sale.cashier_name || '-'} | Total amount: ${Number.parseFloat(sale.total_amount || 0).toFixed(2)}`,
          })),
        }
      case 'expiredProducts':
        return {
          title: 'Expired product details',
          empty: 'No expired products found.',
          summary: `There are ${metrics.expiredProducts} expired products that should be removed from active stock.`,
          items: expiredItems.map((item) => ({
            key: item.id,
            label: item.name,
            meta: `${item.expiry_date ? `Expired on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Expired item'} | Qty: ${item.quantity ?? '-'}`,
          })),
        }
      case 'missingProducts':
        return {
          title: 'Missing alert details',
          empty: 'No missing product reports found.',
          summary: `There are ${metrics.missingProducts} missing product alerts.`,
          items: missingAlerts.map((item) => ({
            key: item.id,
            label: item.product_name || 'Product',
            meta: `Expected: ${item.expected ?? '-'} | Actual: ${item.actual ?? '-'} | Difference: ${item.difference ?? '-'}`,
          })),
        }
      case 'totalProducts':
      default:
        return {
          title: 'Product inventory details',
          empty: 'No products found.',
          summary: `The store currently has ${metrics.totalProducts} products in inventory.`,
          items: products.map((item) => ({
            key: item.id,
            label: item.name,
            meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Category: ${item.category || '-'}`,
          })),
        }
    }
  })()

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
          <button type="button" className={`metric-card metric-accent metric-card-button ${selectedMetric === 'totalProducts' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('totalProducts')} aria-pressed={selectedMetric === 'totalProducts'}>
            <p className="metric-label">Total products</p>
            <div className="metric-value">{metrics.totalProducts}</div>
          </button>
          <button type="button" className={`metric-card metric-card-button ${selectedMetric === 'totalQuantity' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('totalQuantity')} aria-pressed={selectedMetric === 'totalQuantity'}>
            <p className="metric-label">Total quantity</p>
            <div className="metric-value">{metrics.totalQuantity}</div>
          </button>
          <button type="button" className={`metric-card metric-warn metric-card-button ${selectedMetric === 'lowStock' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('lowStock')} aria-pressed={selectedMetric === 'lowStock'}>
            <p className="metric-label">Low stock items</p>
            <div className="metric-value">{metrics.lowStock}</div>
          </button>
          <button type="button" className={`metric-card metric-success metric-card-button ${selectedMetric === 'salesTotal' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('salesTotal')} aria-pressed={selectedMetric === 'salesTotal'}>
            <p className="metric-label">Sales total</p>
            <div className="metric-value">{metrics.salesTotal.toFixed ? metrics.salesTotal.toFixed(2) : metrics.salesTotal}</div>
          </button>
          <button type="button" className={`metric-card metric-warn metric-card-button ${selectedMetric === 'expiredProducts' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('expiredProducts')} aria-pressed={selectedMetric === 'expiredProducts'}>
            <p className="metric-label">Expired products</p>
            <div className="metric-value">{metrics.expiredProducts}</div>
          </button>
          <button type="button" className={`metric-card metric-accent metric-card-button ${selectedMetric === 'missingProducts' ? 'metric-selected' : ''}`} onClick={() => setSelectedMetric('missingProducts')} aria-pressed={selectedMetric === 'missingProducts'}>
            <p className="metric-label">Missing product alerts</p>
            <div className="metric-value">{metrics.missingProducts}</div>
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">{selectedDetails.title}</h2>
        <p className="section-note" style={{ marginTop: 0 }}>{selectedDetails.summary}</p>
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
    </div>
  )
}

export default Dashboard
