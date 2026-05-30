import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import ProductForm from '../components/ProductForm'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Products = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const role = user?.role === 'owner' ? 'ceo' : user?.role
  const canManageProducts = ['manager', 'ceo'].includes(role)
  const canAddProducts = role === 'manager'
  const canDeleteProducts = () => ['manager', 'ceo'].includes(role)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async ()=>{
    setLoading(true)
    try{
      const data = await api.get('/products')
      setProducts(data)
    }catch(e){
      console.error(e)
      alert('Failed to load products')
    }finally{setLoading(false)}
  }, [])

  useEffect(()=>{ load() }, [load])
  useSyncRefresh(load)

  const onCreate = ()=>{ setEditing(null); setShowForm(true) }
  const onEdit = (p)=>{ setEditing(p); setShowForm(true) }
  const onDelete = async (id)=>{
    if (!confirm('Delete product?')) return
    try{
      await api.del(`/products/${id}`)
      await load()
    }catch(e){
      console.error(e); alert('Delete failed')
    }
  }

  const onSearch = (event) => {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const onClearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true
    const haystack = [
      product.name,
      product.barcode,
      product.category,
      product.supplier_name,
      product.expiry_date,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <div className="auth-badge">Inventory</div>
          <h1 className="hero-title" style={{ fontSize: '2.1rem', marginTop: 6 }}>Products</h1>
          <p className="hero-subtitle">Add, review, and maintain your store catalogue in one clean view.</p>
        </div>
        <div className="section-actions products-actions">
          <form className="search-bar" onSubmit={onSearch}>
            <input
              type="search"
              placeholder="Search products by name, barcode, supplier, category..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search products"
            />
            <button className="button-secondary search-button" type="submit">Search</button>
            {searchQuery && (
              <button className="button-secondary search-button" type="button" onClick={onClearSearch}>Clear</button>
            )}
          </form>
          {canAddProducts ? (
            <button className="button-primary" onClick={onCreate}>Add Product</button>
          ) : (
            <span className="nav-chip">Read only</span>
          )}
        </div>
      </section>

      <div className="table-card">
        {loading ? <div className="loading-state">Loading products...</div> : (
          filteredProducts.length ? (
            <>
            <div className="data-table-view">
              <table>
              <thead>
                <tr><th>Name</th><th>Qty</th><th>Expiry</th><th>Supplier</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredProducts.map(p=> (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><span className={p.quantity <= (p.reorder_level || 0) ? 'tag tag-warn' : 'tag tag-success'}>{p.quantity}</span></td>
                    <td>{p.expiry_date || '-'}</td>
                    <td>{p.supplier_name || '-'}</td>
                    <td>
                      <div className="table-actions">
                        {canManageProducts && <button className="button-secondary" onClick={()=>onEdit(p)}>Edit</button>}
                        {canDeleteProducts(p) && <button className="button-danger" onClick={()=>onDelete(p.id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            <div className="data-card-list">
              {filteredProducts.map((p) => (
                <article key={`product-${p.id}`} className="data-card panel">
                  <div className="data-card-head">
                    <div>
                      <h2 className="approval-card-title">{p.name}</h2>
                      <p className="section-note">{p.category || 'Uncategorized'}</p>
                    </div>
                    <span className={p.quantity <= (p.reorder_level || 0) ? 'tag tag-warn' : 'tag tag-success'}>{p.quantity}</span>
                  </div>

                  <div className="approval-card-body">
                    <div>
                      <span className="approval-label">Expiry</span>
                      <div>{p.expiry_date || '-'}</div>
                    </div>
                    <div>
                      <span className="approval-label">Supplier</span>
                      <div>{p.supplier_name || '-'}</div>
                    </div>
                  </div>

                  <div className="approval-card-actions">
                    <div className="table-actions">
                      {canManageProducts && <button className="button-secondary" onClick={()=>onEdit(p)}>Edit</button>}
                      {canDeleteProducts(p) && <button className="button-danger" onClick={()=>onDelete(p.id)}>Delete</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            </>
          ) : (
            <div className="empty-state">
              {searchQuery
                ? `No products matched "${searchQuery}".`
                : 'No products found. Add the first item to start your inventory.'}
            </div>
          )
        )}
      </div>

      {showForm && canManageProducts && (
        <ProductForm product={editing} onClose={()=>{setShowForm(false); setEditing(null)}} onSaved={()=>{setShowForm(false); load()}} />
      )}
    </div>
  )
}

export default Products
