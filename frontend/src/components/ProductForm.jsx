import React, { useState, useEffect, useMemo, useRef } from 'react'
import api from '../services/api'

const ProductForm = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:'', barcode:'', category:'', cost_price:0, selling_price:0, quantity:0, supplier_id:'', expiry_date:'', reorder_level:0
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [markup, setMarkup] = useState(20) // percent markup default
  const [suppliers, setSuppliers] = useState([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [barcodeTouched, setBarcodeTouched] = useState(false)
  const [supplierDraft, setSupplierDraft] = useState({ id: '', name: '', contact: '' })
  const [supplierBusy, setSupplierBusy] = useState(false)
  const [supplierMessage, setSupplierMessage] = useState('')
  const nameRef = useRef(null)

  const generateBarcode = (seed = '') => {
    const base = seed
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 8) || 'ITEM'
    const stamp = Date.now().toString(36).toUpperCase().slice(-5)
    const random = Math.random().toString(36).slice(2, 5).toUpperCase()
    return `SM-${base}-${stamp}${random}`
  }

  const normalizedPayload = useMemo(() => ({
    ...form,
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
  }), [form])

  useEffect(()=>{
    if (product) setForm({
      name:product.name||'', barcode:product.barcode||'', category:product.category||'', cost_price:product.cost_price||0,
      selling_price:product.selling_price||0, quantity:product.quantity||0, supplier_id:product.supplier_id || '', expiry_date:product.expiry_date||'', reorder_level:product.reorder_level||0
    })
    else {
      // focus name for quick add
      setTimeout(()=>{ nameRef.current && nameRef.current.focus() }, 100)
    }
    setBarcodeTouched(Boolean(product?.barcode))
  },[product])

  useEffect(() => {
    const loadSuppliers = async () => {
      setSuppliersLoading(true)
      try {
        const rows = await api.get('/suppliers')
        setSuppliers(Array.isArray(rows) ? rows : [])
      } catch (err) {
        console.error(err)
        setSuppliers([])
      } finally {
        setSuppliersLoading(false)
      }
    }

    loadSuppliers()
  }, [])

  useEffect(() => {
    if (!form.supplier_id) {
      setSupplierDraft({ id: '', name: '', contact: '' })
      return
    }

    const selected = suppliers.find(supplier => String(supplier.id) === String(form.supplier_id))
    if (selected) {
      setSupplierDraft({
        id: selected.id,
        name: selected.name || '',
        contact: selected.contact || '',
      })
    }
  }, [form.supplier_id, suppliers])

  const change = (k,v) => setForm(prev=>({ ...prev, [k]: v }))
  const changeSupplierDraft = (k, v) => setSupplierDraft(prev => ({ ...prev, [k]: v }))

  const refreshSuppliers = async (selectId = '') => {
    const rows = await api.get('/suppliers')
    const nextSuppliers = Array.isArray(rows) ? rows : []
    setSuppliers(nextSuppliers)
    if (selectId) {
      setForm(prev => ({ ...prev, supplier_id: String(selectId) }))
    }
  }

  const saveSupplier = async () => {
    const name = supplierDraft.name.trim()
    if (!name) {
      setSupplierMessage('Supplier name is required.')
      return
    }

    setSupplierBusy(true)
    setSupplierMessage('')
    try {
      let saved
      if (supplierDraft.id) {
        saved = await api.put(`/suppliers/${supplierDraft.id}`, {
          name,
          contact: supplierDraft.contact,
        })
      } else {
        saved = await api.post('/suppliers', {
          name,
          contact: supplierDraft.contact,
        })
      }

      setSupplierDraft({
        id: saved.id,
        name: saved.name || '',
        contact: saved.contact || '',
      })
      await refreshSuppliers(saved.id)
      setSupplierMessage('Supplier saved.')
    } catch (err) {
      console.error(err)
      setSupplierMessage(err?.message || 'Failed to save supplier.')
    } finally {
      setSupplierBusy(false)
    }
  }

  const startNewSupplier = () => {
    setSupplierDraft({ id: '', name: '', contact: '' })
    setForm(prev => ({ ...prev, supplier_id: '' }))
    setSupplierMessage('')
  }

  // recalc selling price when markup or cost changes
  useEffect(()=>{
    const c = parseFloat(form.cost_price) || 0
    const m = parseFloat(markup) || 0
    const computed = Math.round((c * (1 + m/100)) * 100) / 100
    setForm(prev=>({ ...prev, selling_price: computed }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup])

  useEffect(() => {
    if (product || barcodeTouched || !form.name.trim()) return
    const nextBarcode = generateBarcode(form.name)
    setForm(prev => prev.barcode === nextBarcode ? prev : { ...prev, barcode: nextBarcode })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, barcodeTouched, product])

  const submit = async (e, keepOpen=false)=>{
    e && e.preventDefault()
    const nextErrors = {}
    if (!form.name) nextErrors.name = 'Name required'
    if (form.cost_price < 0) nextErrors.cost_price = 'Cost must be >= 0'
    if (form.selling_price < 0) nextErrors.selling_price = 'Price must be >= 0'
    setErrors(nextErrors)
    setServerError('')
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    try{
      if (product) {
        await api.put(`/products/${product.id}`, normalizedPayload)
      } else {
        await api.post('/products', normalizedPayload)
      }
      onSaved && onSaved()
      if (!keepOpen) onClose && onClose()
      else {
        // reset form for quick-add
        setForm({ name:'', barcode:'', category:'', cost_price:0, selling_price:0, quantity:0, supplier_id:'', expiry_date:'', reorder_level:0 })
        setErrors({})
        setBarcodeTouched(false)
        setTimeout(()=>{ nameRef.current && nameRef.current.focus() }, 50)
      }
    }catch(e){
      console.error(e)
      const message = e?.message || 'Unknown error'
      setServerError(
        /invalid token/i.test(message)
          ? 'Your session expired or is invalid. Please log in again.'
          : /forbidden/i.test(message)
            ? 'You do not have permission to add products.'
            : `Save failed: ${message}`
      )
    }finally{ setLoading(false) }
  }

  return (
    <div className="drawer-overlay" role="dialog" aria-modal="true" aria-label={product ? 'Edit product' : 'Add product'}>
      <div className="drawer-panel">
        <div className="drawer-header">
          <div>
            <div className="auth-badge">Quick Add</div>
            <h3 className="modal-title">{product ? 'Edit' : 'Add'} Product</h3>
            <p className="section-note">Keep the form lean: name, barcode, supplier, and pricing are front and center.</p>
          </div>
          <button className="button-secondary" type="button" onClick={onClose} aria-label="Close add product panel">Close</button>
        </div>

        {serverError && <div className="error-banner" style={{marginBottom: 14}}>{serverError}</div>}
        <form onSubmit={(e)=>submit(e)}>
          <div className="form-grid drawer-grid">
            <div className="form-field">
              <label>Name</label>
              <input ref={nameRef} placeholder="e.g. Fresh Milk 1L" value={form.name} onChange={e=>change('name', e.target.value)} />
              {errors.name && <div style={{color:'#ffb4b4',marginTop:6}}>{errors.name}</div>}
            </div>

            <div className="form-field">
              <label>Barcode</label>
              <div className="drawer-inline-input">
                <input placeholder="Auto-generated if empty" value={form.barcode} onChange={e=>{ setBarcodeTouched(true); change('barcode', e.target.value) }} />
                <button type="button" className="button-secondary" onClick={()=>{ setBarcodeTouched(true); change('barcode', generateBarcode(form.name || 'ITEM')) }}>Generate</button>
              </div>
              <div className="helper-text">Auto-generated from the product name until you edit it.</div>
            </div>

            <div className="form-field">
              <label>Category</label>
              <input placeholder="e.g. Dairy" value={form.category} onChange={e=>change('category', e.target.value)} />
            </div>

            <div className="form-field">
              <label>Quantity</label>
              <input type="number" min="0" step="1" value={form.quantity} onChange={e=>change('quantity', parseInt(e.target.value)||0)} />
            </div>

            <div className="form-field">
              <label>Supplier</label>
              <select value={form.supplier_id} onChange={e=>change('supplier_id', e.target.value)}>
                <option value="">No supplier</option>
                {suppliersLoading ? (
                  <option value="" disabled>Loading suppliers...</option>
                ) : suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.contact ? ` - ${supplier.contact}` : ''}</option>
                ))}
              </select>
              <div className="helper-text">Optional. Choose a supplier to keep product sourcing clear.</div>
            </div>

            <div className="supplier-card form-field">
              <div className="supplier-card-header">
                <div>
                  <label>Supplier quick editor</label>
                  <div className="helper-text">Create a new supplier or update the selected one without leaving the drawer.</div>
                </div>
                <button type="button" className="button-secondary" onClick={startNewSupplier}>New supplier</button>
              </div>

              <div className="supplier-grid">
                <div className="form-field">
                  <label>Supplier name</label>
                  <input placeholder="e.g. Golden Farms" value={supplierDraft.name} onChange={e=>changeSupplierDraft('name', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Contact</label>
                  <input placeholder="Phone or email" value={supplierDraft.contact} onChange={e=>changeSupplierDraft('contact', e.target.value)} />
                </div>
              </div>

              <div className="supplier-actions">
                <button type="button" className="button-primary" disabled={supplierBusy} onClick={saveSupplier}>{supplierBusy ? 'Saving supplier...' : (supplierDraft.id ? 'Update supplier' : 'Save supplier')}</button>
                <button type="button" className="button-secondary" onClick={() => change('supplier_id', supplierDraft.id || '')} disabled={!supplierDraft.id}>Use selected supplier</button>
              </div>
              {supplierMessage && <div className="helper-text">{supplierMessage}</div>}
            </div>

            <div className="form-field">
              <label>Cost price (GHS)</label>
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e=>change('cost_price', parseFloat(e.target.value)||0)} />
              {errors.cost_price && <div style={{color:'#ffb4b4',marginTop:6}}>{errors.cost_price}</div>}
            </div>

            <div className="form-field">
              <label>Markup %</label>
              <input type="number" min="0" step="1" value={markup} onChange={e=>setMarkup(parseFloat(e.target.value)||0)} />
            </div>

            <div className="form-field">
              <label>Selling price (GHS)</label>
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e=>change('selling_price', parseFloat(e.target.value)||0)} />
              {errors.selling_price && <div style={{color:'#ffb4b4',marginTop:6}}>{errors.selling_price}</div>}
            </div>

            <div className="form-field">
              <label>Expiry date</label>
              <input type="date" value={form.expiry_date} onChange={e=>change('expiry_date', e.target.value)} />
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
            <div style={{color: 'var(--muted)'}}>Profit: GHS {(form.selling_price - form.cost_price).toFixed(2)}</div>
            <div className="form-actions">
              <button className="button-primary" type="button" disabled={loading} onClick={(e)=>submit(e,false)}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="button-primary" type="button" disabled={loading} onClick={(e)=>submit(e,true)} style={{marginLeft:8}}>{loading ? 'Saving...' : 'Save & Add Another'}</button>
              <button className="button-secondary" type="button" onClick={onClose} style={{marginLeft:8}}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm
