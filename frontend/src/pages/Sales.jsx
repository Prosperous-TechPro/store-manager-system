import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { readSalesSnapshot } from '../services/salesSummary'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Sales = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [productQuery, setProductQuery] = useState('')
  const [typedName, setTypedName] = useState('')
  const [typedQuantity, setTypedQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total_sales: 0, transactions: 0, total_cost: 0, total_profit: 0, details: [] })
  const [searchId, setSearchId] = useState('')
  const [searching, setSearching] = useState(false)
  const [summaryLoaded, setSummaryLoaded] = useState(false)
  
  const [recentSales, setRecentSales] = useState([])
  const typedNameRef = useRef(null)

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.get('/products')
      setProducts(Array.isArray(data) ? data : [])
    } catch (loadError) {
      console.error(loadError)
      setProducts([])
    }
  }, [])

  const readSummary = useCallback(async () => {
    return readSalesSnapshot()
  }, [])

  const loadSummary = useCallback(async () => {
    setSummaryLoaded(false)
    try {
      const nextSummary = await readSummary()
      setSummary(nextSummary)
    } catch (err) {
      console.error(err)
      setSummary({ total_sales: 0, transactions: 0, total_cost: 0, total_profit: 0, details: [] })
    } finally {
      setSummaryLoaded(true)
    }
  }, [readSummary])


  const loadRecentSales = useCallback(async () => {
    try {
      const data = await api.get('/sales') // Requirement 9: Fetch history
      setRecentSales(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load recent sales', err)
    }
  }, [])

  const broadcastSync = () => {
    const stamp = String(Date.now())
    window.localStorage.setItem('store-sync', stamp)
    window.dispatchEvent(new Event('store-sync'))
  }

  useEffect(() => {
    loadProducts()
    loadSummary()
    loadRecentSales()
  }, [loadProducts, loadSummary, loadRecentSales])

  useSyncRefresh(loadProducts)
  useSyncRefresh(loadSummary)
  useSyncRefresh(loadRecentSales)

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (!query) return products.slice(0, 50)
    return products.filter((product) => [product.name, product.barcode, product.category, product.supplier_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)).slice(0, 50)
  }, [productQuery, products])

  // Requirement 3: Live preview of price and line total before adding to cart
  const selectedProductPreview = useMemo(() => {
    const name = typedName.trim().toLowerCase()
    if (!name) return null
    const product = products.find((item) => String(item.name || '').trim().toLowerCase() === name)
    return product || null
  }, [typedName, products])

  const cartTotal = cart.reduce((sum, item) => sum + (Number.parseFloat(item.unitPrice || 0) * Number.parseInt(item.quantity || 0, 10)), 0)

  const addToCart = (product, quantityToAdd = 1) => {
    const safeQty = Number.parseInt(quantityToAdd, 10)
    const qty = Number.isFinite(safeQty) && safeQty > 0 ? safeQty : 1
    const stock = Number.parseInt(product.quantity || 0, 10)
    
    if (stock <= 0) {
      setError(`${product.name} is out of stock.`)
      return
    }

    setError('')
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        const nextQty = existing.quantity + qty
        return current.map((item) => (
          item.productId === product.id
            ? { ...item, quantity: nextQty > stock ? stock : nextQty }
            : item
        ))
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          quantity: qty > stock ? stock : qty,
          unitPrice: Number.parseFloat(product.selling_price || 0),
          stock,
        },
      ]
    })
    setProductQuery('')
  }

  const addTypedProduct = () => {
    const name = typedName.trim().toLowerCase()
    const qty = Number.parseInt(typedQuantity, 10)
    if (!name) {
      setError('Type the product name.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be at least 1.')
      return
    }

    const product = products.find((item) => String(item.name || '').trim().toLowerCase() === name)
    if (!product) {
      setError('Item not found.') // Requirement 8: Item not found response
      return
    }

    addToCart(product, qty)
    setError('')
    setTypedName('')
    setTypedQuantity(1)
    setMessage(`Added ${product.name}. Keep adding items or generate the receipt when you are done.`)
    requestAnimationFrame(() => typedNameRef.current?.focus())
  }

  const updateCartItem = (productId, nextQuantity) => {
    const parsedQuantity = Number.parseInt(nextQuantity, 10)
    setCart((current) => current.map((item) => (
      item.productId === productId
        ? {
          ...item,
          quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0
            ? (parsedQuantity > item.stock ? item.stock : parsedQuantity)
            : 1,
        }
        : item
    )))
  }

  const removeCartItem = (productId) => {
    setCart((current) => current.filter((item) => item.productId !== productId))
  }

  // Requirement 10: Robust search functionality for both roles
  const handleSearchReceipt = async (idOrEvent) => {
    if (idOrEvent && typeof idOrEvent !== 'string' && idOrEvent.preventDefault) {
      idOrEvent.preventDefault();
    }
    const targetId = typeof idOrEvent === 'string' ? idOrEvent : searchId;
    
    if (!targetId.trim()) return
    
    navigate(`/receipt/${targetId}`)
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    setMessage('')

    if (!cart.length) {
      setError('Add at least one product from the system')
      return
    }

    const items = cart.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.unitPrice, // Send as 'price' to match backend expectation
    }))

    setSaving(true)
    try {
      const result = await api.post('/sales', { items, customer_name: customerName })
      
      setCart([])
      setProductQuery('')
      setCustomerName('')
      broadcastSync()
      
      // Redirect to preview page
      navigate(`/receipt/${result.saleId || result.id}`)
    } catch (err) {
      setError(err.message || 'Failed to record sales')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page landing-page">
      <section className="hero-card landing-hero">
        <div className="hero-copy">
          <div className="auth-badge">Sales workspace</div>
          <h1 className="hero-title">Record daily sales with a clean, focused interface.</h1>
          <p className="hero-subtitle">Keep sales totals current and visible in real time for all users.</p>
        </div>

        <div className="hero-showcase">
          <div className="metric-grid landing-metrics">
            <div className="metric-card metric-success">
              <p className="metric-label">Total sales</p>
              <div className="metric-value">{summaryLoaded ? `GHS ${Number.parseFloat(summary.total_sales || 0).toFixed(2)}` : 'Loading...'}</div>
            </div>
            <div className="metric-card metric-accent">
              <p className="metric-label">Transactions</p>
              <div className="metric-value">{summaryLoaded ? summary.transactions : 'Loading...'}</div>
            </div>
            {/* Removed Total Cost Price and Total Profit metrics per request */}
          </div>
        </div>
      </section>

      {/* Profit & Cost breakdown removed from view */}

      <section className="panel" style={{ maxWidth: 960 }}>
        <div className="form-grid" style={{ marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
          <div className="form-field">
            <label>Search Receipt by ID</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. 10045"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              <button 
                type="button" 
                className="button-secondary" 
                onClick={handleSearchReceipt}
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="table-card" style={{ marginTop: 12 }}>
            <div className="section-actions" style={{ marginBottom: 16 }}>
              <div>
                <p className="section-note" style={{ margin: 0 }}>Receipt cart</p>
                <h2 className="approval-card-title" style={{ margin: '4px 0 0' }}>Current sale</h2>
              </div>
              <div className="section-actions">
                <div className="nav-chip">Items {cart.length}</div>
                <div className="nav-chip">Total GHS {cartTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="form-field" style={{ padding: '0 16px' }}>
              <label>Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional: Customer name for the receipt"
              />
            </div>

            {cart.length ? (
              <div className="data-table-view">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Total price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.productId}>
                        <td>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</td>
                        <td>{item.productName}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateCartItem(item.productId, event.target.value)}
                            style={{ width: 90 }}
                          />
                        </td>
                        <td>GHS {Number.parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                        <td>GHS {(Number.parseFloat(item.unitPrice || 0) * Number.parseInt(item.quantity || 0, 10)).toFixed(2)}</td>
                        <td>
                          <button type="button" className="button-secondary" onClick={() => removeCartItem(item.productId)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No products added to the receipt yet.</div>
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}
          {message && (
            <div className={message.startsWith('Recorded GHS') ? 'success-banner success-banner--black' : 'success-banner'}>{message}</div>
          )}
          <div className="auth-actions">
            <button type="button" className="button-primary" onClick={submit} disabled={saving || !cart.length}>{saving ? 'Saving...' : 'Generate receipt'}</button>
          </div>

          <div className="form-field" style={{ marginTop: 24 }}>
            <label>Search product in system</label>
            <input
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>Type product name</label>
              <input
                ref={typedNameRef}
                list="sales-product-names"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="e.g. Fresh Milk 1L"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTypedProduct()
                  }
                }}
              />
              <datalist id="sales-product-names">
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>
              {selectedProductPreview && (
                <div className="section-note" style={{ color: 'var(--success-color)', marginTop: 4 }}>
                  <strong>Requirement 3:</strong> Unit Price: GHS {Number.parseFloat(selectedProductPreview.selling_price).toFixed(2)} | 
                  Subtotal: GHS {(Number.parseFloat(selectedProductPreview.selling_price) * Number.parseInt(typedQuantity || 0, 10)).toFixed(2)}
                </div>
              )}
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={typedQuantity}
                onChange={(e) => setTypedQuantity(e.target.value)}
              />
            </div>
            <button type="button" className="button-secondary" onClick={addTypedProduct}>
              Add another item
            </button>
          </div>

          <div className="product-picker-grid">
            {filteredProducts.length ? filteredProducts.map((product) => (
              <article key={product.id} className="data-card panel" style={{ marginBottom: 0 }}>
                <div className="data-card-head">
                  <div>
                    <h2 className="approval-card-title">{product.name}</h2>
                    <p className="section-note">{product.barcode ? `SKU: ${product.barcode}` : 'No SKU'} | {product.category || 'Uncategorized'}</p>
                  </div>
                  <span className="tag tag-success">{Number.parseFloat(product.selling_price || 0).toFixed(2)}</span>
                </div>
                <div className="approval-card-body">
                  <div>
                    <span className="approval-label">Available</span>
                    <div>{product.quantity ?? 0}</div>
                  </div>
                  <div>
                    <span className="approval-label">Supplier</span>
                    <div>{product.supplier_name || '-'}</div>
                  </div>
                </div>
                <div className="approval-card-actions">
                  <button type="button" className="button-secondary" onClick={() => addToCart(product)} disabled={Number.parseInt(product.quantity || 0, 10) <= 0}>
                    Add to receipt
                  </button>
                </div>
              </article>
            )) : (
              <div className="empty-state">No matching product found in the system.</div>
            )}
          </div>
        </div>
      </section>

      {/* Requirement 9: Historical Log sorted by Time */}
      <section className="panel" style={{ maxWidth: 960, marginTop: 24 }}>
        <h2 className="approval-card-title">Recent Transactions</h2>
        <div className="data-table-view">
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date/Time</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>{new Date(s.date).toLocaleString()}</td>
                  <td>{s.customer_name || 'N/A'}</td>
                  <td>GHS {Number.parseFloat(s.total_amount).toFixed(2)}</td>
                  <td>
                    <button className="button-secondary" onClick={() => handleSearchReceipt(String(s.id))}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Sales
