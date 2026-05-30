import React, { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const metricTitles = {
  'total-products': 'Product inventory details',
  'total-quantity': 'Total quantity details',
  'low-stock': 'Low stock details',
  'sales-total': 'Sales details',
  'expired-products': 'Expired product details',
  'missing-products': 'Missing alert details',
}

const metricEmptyMessages = {
  'total-products': 'No products found.',
  'total-quantity': 'No product quantities found.',
  'low-stock': 'No low stock items found.',
  'sales-total': 'No sales records found.',
  'expired-products': 'No expired products found.',
  'missing-products': 'No missing product reports found.',
}

const DashboardDetails = () => {
  const { metricId } = useParams()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const role = user?.role === 'owner' ? 'ceo' : user?.role
  const canViewDashboard = ['manager', 'ceo', 'admin'].includes(role)
  const canViewSalesTotal = ['casher', 'manager', 'saler', 'ceo', 'admin'].includes(role)
  const hasAccess = metricId === 'sales-total' ? canViewSalesTotal : canViewDashboard
  const backTarget = metricId === 'sales-total' && !canViewDashboard ? '/sales' : '/dashboard'
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!hasAccess) {
      return
    }

    setLoading(true)
    setError('')

    try {
      if (metricId === 'sales-total') {
        const sales = await api.get('/sales')

        const salesList = Array.isArray(sales) ? sales : []
        const totalSales = salesList.reduce((total, sale) => total + Number.parseFloat(sale.total_amount || 0), 0)
        const transactions = salesList.length

        setSummary(`There are ${transactions} sales transactions totaling ${Number.isFinite(totalSales) ? totalSales.toFixed(2) : '0.00'}.`)
        setItems(salesList.map((sale) => ({
          key: sale.id,
          label: sale.date ? new Date(sale.date).toLocaleString() : `Sale #${sale.id}`,
          meta: `Cashier: ${sale.cashier_name || '-'} | Total amount: ${Number.parseFloat(sale.total_amount || 0).toFixed(2)}`,
        })))
        return
      }

      const [products, expiry, missing] = await Promise.all([
        api.get('/products'),
        api.get('/reports/expiry'),
        api.get('/reports/missing'),
      ])

      const productsList = Array.isArray(products) ? products : []
      const expiryList = Array.isArray(expiry) ? expiry : []
      const missingList = Array.isArray(missing) ? missing : []

      switch (metricId) {
        case 'total-products':
          setSummary(`The store currently has ${productsList.length} products in inventory.`)
          setItems(productsList.map((item) => ({
            key: item.id,
            label: item.name,
            meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Category: ${item.category || '-'}`,
          })))
          break
        case 'total-quantity':
          setSummary(`Across ${productsList.length} products, the store currently holds ${productsList.reduce((total, product) => total + (product.quantity || 0), 0)} units.`)
          setItems(productsList
            .slice()
            .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
            .map((item) => ({
              key: item.id,
              label: item.name,
              meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Price: ${Number.parseFloat(item.price || 0).toFixed(2)}`,
            })))
          break
        case 'low-stock':
          setSummary(`There are ${productsList.filter((product) => (product.reorder_level || 0) >= (product.quantity || 0)).length} products at or below their reorder level.`)
          setItems(productsList.filter((product) => (product.reorder_level || 0) >= (product.quantity || 0)).map((item) => ({
            key: item.id,
            label: item.name,
            meta: `Quantity: ${item.quantity ?? 0} | Reorder level: ${item.reorder_level ?? 0} | Category: ${item.category || '-'}`,
          })))
          break
        case 'expired-products':
          setSummary(`There are ${expiryList.filter((item) => item.status === 'expired').length} expired products that should be removed from active stock.`)
          setItems(expiryList.filter((item) => item.status === 'expired').map((item) => ({
            key: item.id,
            label: item.name,
            meta: `${item.expiry_date ? `Expired on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Expired item'} | Qty: ${item.quantity ?? '-'}`,
          })))
          break
        case 'missing-products':
          setSummary(`There are ${missingList.length} missing product alerts.`)
          setItems(missingList.map((item) => ({
            key: item.id,
            label: item.product_name || 'Product',
            meta: `Expected: ${item.expected ?? '-'} | Actual: ${item.actual ?? '-'} | Difference: ${item.difference ?? '-'}`,
          })))
          break
        default:
          setError('That dashboard metric does not exist.')
          setItems([])
          setSummary('')
      }
    } catch (loadError) {
      console.error(loadError)
      setError('Failed to load dashboard details.')
    } finally {
      setLoading(false)
    }
  }, [hasAccess, metricId])

  useEffect(() => { load() }, [load])
  useSyncRefresh(load)

  const title = metricTitles[metricId]
  const emptyMessage = metricEmptyMessages[metricId]

  if (!hasAccess) {
    return <Navigate to={canViewSalesTotal ? '/sales' : '/products'} replace />
  }

  return (
    <div className="page">
      <section className="hero-card">
        <div className="auth-badge">Metric details</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">{title || 'Dashboard details'}</h1>
            <p className="hero-subtitle">A focused breakdown of the metric you selected from the dashboard.</p>
          </div>
          <Link className="nav-chip nav-chip-link" to={backTarget}>{backTarget === '/sales' ? 'Back to sales' : 'Back to dashboard'}</Link>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <p className="section-note">Loading metric details...</p>
        ) : error ? (
          <p className="section-note">{error}</p>
        ) : (
          <>
            <p className="section-note" style={{ marginTop: 0 }}>{summary}</p>
            {items.length ? (
              <ul className="policy-list">
                {items.map((item) => (
                  <li key={item.key}>
                    <strong>{item.label}</strong>
                    <div className="section-note">{item.meta}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">{emptyMessage}</p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default DashboardDetails