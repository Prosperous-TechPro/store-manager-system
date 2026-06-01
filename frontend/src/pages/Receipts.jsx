import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Receipts = () => {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/sales/details')
      setReceipts(Array.isArray(data) ? data : [])
    } catch (loadError) {
      console.error(loadError)
      setError(loadError.message || 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useSyncRefresh(load)

  const printReceipt = (receipt) => {
    const printWindow = window.open('', '_blank', 'width=420,height=640')
    if (!printWindow) return

    const receiptDate = receipt.date ? new Date(receipt.date).toLocaleString() : ''
    const rows = (receipt.items || []).map((item) => `
      <tr>
        <td>${item.product_name}</td>
        <td style="text-align:right;">${item.quantity}</td>
        <td style="text-align:right;">GHS ${Number.parseFloat(item.price || 0).toFixed(2)}</td>
        <td style="text-align:right;">GHS ${Number.parseFloat(item.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1, p { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; font-size: 13px; }
            th { text-align: left; }
            .summary { margin-top: 16px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Store Receipt</h1>
          <p>Receipt #: ${receipt.id}</p>
          <p>Date: ${receiptDate}</p>
          <p>Cashier: ${receipt.cashier_name || 'Cashier'}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Line Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">Total: GHS ${Number.parseFloat(receipt.total_amount || 0).toFixed(2)}</div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="page">
      <section className="hero-card">
        <div className="auth-badge">Receipts</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">Receipt history</h1>
            <p className="hero-subtitle">Saved customer receipts are stored here for manager review and reprinting.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <p className="section-note">Loading receipts...</p>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : receipts.length ? (
          <div className="data-card-list">
            {receipts.map((receipt) => (
              <article key={receipt.id} className="data-card panel">
                <div className="data-card-head">
                  <div>
                    <h2 className="approval-card-title">Receipt #{receipt.id}</h2>
                    <p className="section-note">{receipt.date ? new Date(receipt.date).toLocaleString() : '-'}</p>
                  </div>
                  <span className="tag tag-success">GHS {Number.parseFloat(receipt.total_amount || 0).toFixed(2)}</span>
                </div>

                <div className="approval-card-body">
                  <div>
                    <span className="approval-label">Cashier</span>
                    <div>{receipt.cashier_name || '-'}</div>
                  </div>
                  <div>
                    <span className="approval-label">Items</span>
                    <div>{receipt.items?.length || 0}</div>
                  </div>
                </div>

                <div className="approval-card-actions">
                  <button type="button" className="button-secondary" onClick={() => printReceipt(receipt)}>Print receipt</button>
                </div>

                <div className="data-table-view" style={{ marginTop: 16 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit price</th>
                        <th>Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(receipt.items || []).map((item, index) => (
                        <tr key={`${receipt.id}-${index}`}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>GHS {Number.parseFloat(item.price || 0).toFixed(2)}</td>
                          <td>GHS {Number.parseFloat(item.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No receipts have been generated yet.</div>
        )}
      </section>
    </div>
  )
}

export default Receipts