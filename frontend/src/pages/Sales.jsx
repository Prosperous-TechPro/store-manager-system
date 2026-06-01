import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import { readSalesSnapshot } from '../services/salesSummary'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Sales = () => {
  const [products, setProducts] = useState([])
  const [productQuery, setProductQuery] = useState('')
  const [typedName, setTypedName] = useState('')
  const [typedQuantity, setTypedQuantity] = useState(1)
  const [cart, setCart] = useState([])
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total_sales: 0, transactions: 0 })
  const [summaryLoaded, setSummaryLoaded] = useState(false)
  const typedNameRef = useRef(null)
  const receiptSectionRef = useRef(null)
  const receiptPrintButtonRef = useRef(null)

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
      setSummary({
        total_sales: nextSummary.total_sales,
        transactions: nextSummary.transactions,
      })
    } catch (err) {
      console.error(err)
      setSummary({ total_sales: 0, transactions: 0 })
    } finally {
      setSummaryLoaded(true)
    }
  }, [readSummary])

  const broadcastSync = () => {
    const stamp = String(Date.now())
    window.localStorage.setItem('store-sync', stamp)
    window.dispatchEvent(new Event('store-sync'))
  }

  useEffect(() => {
    loadProducts()
    loadSummary()
  }, [loadProducts, loadSummary])

  useEffect(() => {
    if (!receipt) return
    receiptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    receiptPrintButtonRef.current?.focus()
  }, [receipt])

  useSyncRefresh(loadProducts)
  useSyncRefresh(loadSummary)

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (!query) return products.slice(0, 50)
    return products.filter((product) => [product.name, product.barcode, product.category, product.supplier_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)).slice(0, 50)
  }, [productQuery, products])

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
      setError('Product not found in system. Use an existing product name.')
      return
    }

    addToCart(product, qty)
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

  const printReceipt = (currentReceipt) => {
    if (!currentReceipt) return

    const printWindow = window.open('', '_blank', 'width=420,height=640')
    if (!printWindow) return

    const receiptDate = currentReceipt.date ? new Date(currentReceipt.date).toLocaleString() : new Date().toLocaleString()
    const rows = currentReceipt.items.map((item) => `
      <tr>
        <td>${receiptDate}</td>
        <td>${item.product_name}</td>
        <td style="text-align:right;">${item.quantity}</td>
        <td style="text-align:right;">GHS ${Number.parseFloat(item.unit_price || 0).toFixed(2)}</td>
        <td style="text-align:right;">GHS ${Number.parseFloat(item.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${currentReceipt.saleId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1, h2, p { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; font-size: 13px; }
            th { text-align: left; }
            .summary { margin-top: 16px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Store Receipt</h1>
          <p>Receipt #: ${currentReceipt.saleId}</p>
          <p>Date: ${receiptDate}</p>
          <p>Cashier: ${currentReceipt.cashier_name || 'Cashier'}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Total Price</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">Total: GHS ${Number.parseFloat(currentReceipt.total || 0).toFixed(2)}</div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
      price: item.unitPrice,
    }))

    setSaving(true)
    try {
      const result = await api.post('/sales', { items })
      const nextReceipt = {
        saleId: result.saleId,
        total: Number.parseFloat(result.total || cartTotal),
        date: result.date,
        cashier_name: result.cashier_name || JSON.parse(localStorage.getItem('user') || 'null')?.name || 'Cashier',
        items: Array.isArray(result.items) && result.items.length
          ? result.items
          : cart.map((item) => ({
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: Number.parseFloat(item.unitPrice || 0) * Number.parseInt(item.quantity || 0, 10),
          })),
      }
      setReceipt(nextReceipt)
      setMessage(`Receipt #${result.saleId} recorded successfully.`)
      setCart([])
      setProductQuery('')
      await loadSummary()
      await loadProducts()
      broadcastSync()
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
          <div className="auth-badge">Cashier workspace</div>
          <h1 className="hero-title">Record daily sales with a clean, focused interface.</h1>
          <p className="hero-subtitle">Keep the sales total current and visible while you work. This page uses the same visual language as the homepage so the whole system feels consistent.</p>
        </div>

        <div className="hero-showcase">
          <div className="metric-grid landing-metrics">
            <div className="metric-card metric-success">
              <p className="metric-label">Sales total</p>
              <div className="metric-value">{summaryLoaded ? `GHS ${Number.parseFloat(summary.total_sales || 0).toFixed(2)}` : 'Loading...'}</div>
            </div>
            <div className="metric-card metric-accent">
              <p className="metric-label">Transactions</p>
              <div className="metric-value">{summaryLoaded ? summary.transactions : 'Loading...'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ maxWidth: 960 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>Search product in system</label>
            <input
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Type a product name or barcode"
            />
            <div className="section-note">Add as many products as the customer wants. Build the full cart first, then click Generate receipt once you are done.</div>
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
                    <p className="section-note">{product.barcode || 'No barcode'} | {product.category || 'Uncategorized'}</p>
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
                        <td>{new Date().toLocaleDateString()}</td>
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
            <button type="button" className="button-secondary" onClick={() => setCart([])} disabled={saving || !cart.length}>Clear cart</button>
            <button type="button" className="button-secondary" onClick={() => receipt && printReceipt(receipt)} disabled={!receipt}>Print last receipt</button>
          </div>

          {receipt && (
            <section className="panel" style={{ marginTop: 12 }} ref={receiptSectionRef}>
              <div className="section-actions" style={{ marginBottom: 12 }}>
                <div>
                  <p className="section-note" style={{ margin: 0 }}>Generated receipt</p>
                  <h2 className="approval-card-title" style={{ margin: '4px 0 0' }}>Receipt #{receipt.saleId}</h2>
                </div>
                <button type="button" className="button-secondary" onClick={() => printReceipt(receipt)} ref={receiptPrintButtonRef}>Print receipt</button>
              </div>

              <div className="section-note">Date: {receipt.date ? new Date(receipt.date).toLocaleString() : new Date().toLocaleString()}</div>
              <div className="section-note">Cashier: {receipt.cashier_name || 'Cashier'}</div>

              <div className="data-table-view" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Total price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, index) => (
                      <tr key={`${item.product_name}-${index}`}>
                        <td>{receipt.date ? new Date(receipt.date).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>GHS {Number.parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td>GHS {Number.parseFloat(item.line_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="nav-chip" style={{ marginTop: 12, display: 'inline-flex' }}>
                Total GHS {Number.parseFloat(receipt.total || 0).toFixed(2)}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}

export default Sales
