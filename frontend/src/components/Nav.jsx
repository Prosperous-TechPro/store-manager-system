import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Nav = ()=>{
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const role = user?.role === 'owner' ? 'ceo' : user?.role
  const canViewRequests = ['manager', 'ceo'].includes(role)

  const logout = ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='/login' }
  const location = useLocation()
  const hideLogout = location?.pathname === '/account'
  const canViewRecords = ['manager', 'ceo', 'admin'].includes(role)
  const canViewDashboard = ['manager', 'ceo', 'admin'].includes(role)
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
          {canViewDashboard && <Link to="/dashboard">Dashboard</Link>}
          <Link to="/products">Products</Link>
          {canViewRecords && <Link to="/records">Records</Link>}
          {canViewRequests && <Link to="/requests">Request for approval</Link>}
        </div>
        <div className="nav-actions">
          {canViewAlerts && alertCount > 0 && <Link className="nav-chip" to="/alerts">Alerts {alertCount}</Link>}
          {user ? (
            <>
              <Link className="nav-account-card" to="/account" aria-label="Open account details">
                <span className="nav-account-label">Account</span>
                <span className="nav-account-name">{user.name}</span>
                <span className="nav-account-role">Role: {role === 'ceo' ? 'CEO' : user.role}</span>
              </Link>
              {!hideLogout && <button className="button-secondary" onClick={logout}>Logout</button>}
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
