import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Receipts = () => {
  const [receipts, setReceipts] = useState([])
  const [receiptQuery, setReceiptQuery] = useState('')
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

  const filteredReceipts = receipts.filter((receipt) => {
    const query = receiptQuery.trim().toLowerCase()
    if (!query) return true
    return String(receipt.id || '').toLowerCase().includes(query)
  })

  return (
    <div className="page">
      <section className="hero-card">
        <div className="auth-badge">Receipts</div>
        <div className="page-header">
          <div>
            <h1 className="hero-title">Receipt history</h1>
            <p className="hero-subtitle">Saved customer receipts are stored here for manager review. Printing is restricted to cashier checkout flow.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="form-field" style={{ marginBottom: 16 }}>
          <label>Search by receipt number</label>
          <input
            type="search"
            value={receiptQuery}
            onChange={(event) => setReceiptQuery(event.target.value)}
            placeholder="Type receipt number, e.g. 42"
          />
          <div className="section-note">Manager and CEO can search receipts by receipt number only.</div>
        </div>

        {loading ? (
          <p className="section-note">Loading receipts...</p>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : filteredReceipts.length ? (
          <div className="data-card-list">
            {filteredReceipts.map((receipt) => (
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
          <div className="empty-state">
            {receiptQuery.trim() ? 'No receipt matches that number.' : 'No receipts have been generated yet.'}
          </div>
        )}
      </section>
    </div>
  )
}

export default Receipts