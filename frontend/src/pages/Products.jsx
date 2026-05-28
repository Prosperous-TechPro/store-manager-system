import React, { useEffect, useState } from 'react'
import api from '../services/api'
import ProductForm from '../components/ProductForm'

const Products = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManageProducts = ['manager', 'owner'].includes(user?.role)
  const canDeleteProducts = user?.role === 'owner'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async ()=>{
    setLoading(true)
    try{
      const data = await api.get('/products')
      setProducts(data)
    }catch(e){
      console.error(e)
      alert('Failed to load products')
    }finally{setLoading(false)}
  }

  useEffect(()=>{ load() }, [])

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

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <div className="auth-badge">Inventory</div>
          <h1 className="hero-title" style={{ fontSize: '2.1rem', marginTop: 6 }}>Products</h1>
          <p className="hero-subtitle">Add, review, and maintain your store catalogue in one clean view.</p>
        </div>
        <div className="section-actions">
          {canManageProducts ? (
            <button className="button-primary" onClick={onCreate}>Add Product</button>
          ) : (
            <span className="nav-chip">Read only</span>
          )}
        </div>
      </section>

      <div className="table-card">
        {loading ? <div className="loading-state">Loading products...</div> : (
          products.length ? (
            <table>
              <thead>
                <tr><th>Name</th><th>Qty</th><th>Expiry</th><th>Supplier</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p=> (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><span className={p.quantity <= (p.reorder_level || 0) ? 'tag tag-warn' : 'tag tag-success'}>{p.quantity}</span></td>
                    <td>{p.expiry_date || '-'}</td>
                    <td>{p.supplier_name || '-'}</td>
                    <td>
                      <div className="table-actions">
                        {canManageProducts && <button className="button-secondary" onClick={()=>onEdit(p)}>Edit</button>}
                        {canDeleteProducts && <button className="button-danger" onClick={()=>onDelete(p.id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No products found. Add the first item to start your inventory.</div>
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
