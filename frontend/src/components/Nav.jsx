import React from 'react'
import { Link } from 'react-router-dom'

const Nav = ()=>{
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const logout = ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='/login' }
  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <span>Store Management System</span>
            <span>Inventory control</span>
          </span>
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/products">Products</Link>
        </div>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-chip">{user.name}</span>
              <button className="button-secondary" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="button-primary">Login</Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Nav
