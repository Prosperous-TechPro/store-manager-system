import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

const metricTitles = {
  sales: 'Sales details',
  expired: 'Expired product details',
  missing: 'Missing product details',
  in_3_months: 'Expiring in 3 months details',
  in_2_months: 'Expiring in 2 months details',
  in_1_month: 'Expiring in 1 month details',
}

const metricEmptyMessages = {
  sales: 'No sales records found.',
  expired: 'No expired products found.',
  missing: 'No missing product reports found.',
  in_3_months: 'No expiring items found.',
  in_2_months: 'No expiring items found.',
  in_1_month: 'No expiring items found.',
}

const AlertsDetails = () => {
  const { metricId } = useParams()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  const formatCurrency = (value) => Number.parseFloat(value || 0).toFixed(2)

  const buildProductMeta = (product, extraLines = []) => [
    `Barcode: ${product.barcode || '-'}`,
    `Category: ${product.category || '-'}`,
    `Quantity: ${product.quantity ?? 0}`,
    `Reorder level: ${product.reorder_level ?? 0}`,
    `Cost price: ${formatCurrency(product.cost_price)}`,
    `Selling price: ${formatCurrency(product.selling_price)}`,
    `Supplier: ${product.supplier_name || '-'}`,
    product.expiry_date ? `Expiry date: ${new Date(product.expiry_date).toLocaleDateString()}` : 'Expiry date: -',
    ...extraLines,
  ]

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
        const products = await api.get('/products')

        const salesList = Array.isArray(sales) ? sales : []
        const expiryList = Array.isArray(expiry) ? expiry : []
        const missingList = Array.isArray(missing) ? missing : []
        const productsList = Array.isArray(products) ? products : []
        const productById = new Map(productsList.map((product) => [String(product.id), product]))
        const expiredItems = expiryList.filter((item) => item.status === 'expired')
        const in3 = expiryList.filter((item) => item.status === 'in_3_months')
        const in2 = expiryList.filter((item) => item.status === 'in_2_months')
        const in1 = expiryList.filter((item) => item.status === 'in_1_month')

        switch (metricId) {
          case 'sales':
            setSummary(`There are ${salesList.length} sales transactions totaling ${salesList.reduce((sum, sale) => sum + Number.parseFloat(sale.total_amount || 0), 0).toFixed(2)}.`)
            setItems(salesList.map((sale) => ({
              key: sale.id,
              label: sale.date ? new Date(sale.date).toLocaleString() : `Sale #${sale.id}`,
              meta: `Cashier: ${sale.cashier_name || '-'} | Total amount: ${Number.parseFloat(sale.total_amount || 0).toFixed(2)}`,
            })))
            break
          case 'expired':
            setSummary(`There are ${expiredItems.length} expired products that should be removed from active stock.`)
            setItems(expiredItems.map((item) => ({
              key: item.id,
              label: item.name,
              meta: buildProductMeta(item, [
                item.expiry_date ? `Expired on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Expired item',
                'Status: expired',
              ]).join(' | '),
            })))
            break
          case 'missing':
            setSummary(`There are ${missingList.length} missing product alerts.`)
            setItems(missingList.map((item) => ({
              key: item.id,
              label: item.product_name || 'Product',
              meta: (() => {
                const product = productById.get(String(item.product_id))
                if (!product) {
                  return `Expected: ${item.expected ?? '-'} | Actual: ${item.actual ?? '-'} | Difference: ${item.difference ?? '-'} | Product record not found`
                }
                return buildProductMeta(product, [
                  `Expected: ${item.expected ?? '-'}`,
                  `Actual: ${item.actual ?? '-'}`,
                  `Difference: ${item.difference ?? '-'}`,
                  `Loss value: ${formatCurrency(item.loss_value)}`,
                  `Detected by: ${item.detected_by ?? '-'}`,
                ]).join(' | ')
              })(),
            })))
            break
          case 'in_3_months':
            setSummary(`There are ${in3.length} items expiring in about 90 days.`)
            setItems(in3.map((item) => ({
              key: item.id,
              label: item.name,
              meta: buildProductMeta(item, [
                item.expiry_date ? `Expires on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Pending expiry date',
                'Status: expires in 3 months',
              ]).join(' | '),
            })))
            break
          case 'in_2_months':
            setSummary(`There are ${in2.length} items expiring in about 60 days.`)
            setItems(in2.map((item) => ({
              key: item.id,
              label: item.name,
              meta: buildProductMeta(item, [
                item.expiry_date ? `Expires on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Pending expiry date',
                'Status: expires in 2 months',
              ]).join(' | '),
            })))
            break
          case 'in_1_month':
            setSummary(`There are ${in1.length} items expiring in about 30 days.`)
            setItems(in1.map((item) => ({
              key: item.id,
              label: item.name,
              meta: buildProductMeta(item, [
                item.expiry_date ? `Expires on ${new Date(item.expiry_date).toLocaleDateString()}` : 'Pending expiry date',
                'Status: expires in 1 month',
              ]).join(' | '),
            })))
            break
          default:
            setError('That alert does not exist.')
            setItems([])
            setSummary('')
        }
      } catch (loadError) {
        console.error(loadError)
        setError('Failed to load alert details.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [metricId])

  const title = metricTitles[metricId]
  const emptyMessage = metricEmptyMessages[metricId]

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Alert details</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">{title || 'Alert details'}</h1>
            <p className="hero-subtitle">Detailed breakdown of the selected manager or CEO notification.</p>
          </div>
          <Link className="nav-chip nav-chip-link" to="/alerts">Back to alerts</Link>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <p className="section-note">Loading alert details...</p>
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

export default AlertsDetails