import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../services/api'

const Nav = ()=>{
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const role = user?.role === 'owner' ? 'ceo' : user?.role
  const canViewAlerts = ['manager', 'ceo', 'admin'].includes(role)
  const canViewRequests = ['manager', 'ceo'].includes(role)
  const canViewSales = ['casher'].includes(role)
  const canViewDashboard = ['casher', 'manager', 'ceo', 'admin'].includes(role)
  const [alertCount, setAlertCount] = useState(0)
  const [acctOpen, setAcctOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const acctRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const loadAlerts = async () => {
      if (!canViewAlerts || !user) return
      try {
        const [expiry, missing] = await Promise.all([
          api.get('/reports/expiry'),
          api.get('/reports/missing'),
        ])
        const expiredCount = Array.isArray(expiry) ? expiry.filter((item) => item.status === 'expired').length : 0
        const missingCount = Array.isArray(missing) ? missing.length : 0
        setAlertCount(expiredCount + missingCount)
      } catch (error) {
        setAlertCount(0)
      }
    }

    loadAlerts()
  }, [canViewAlerts, user])

  useEffect(() => {
    const onDoc = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', mobileOpen)
    return () => document.body.classList.remove('mobile-menu-open')
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
    setAcctOpen(false)
  }, [location.pathname])

  const logout = ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='/login' }
  const hideLogout = location?.pathname === '/account'
  const canViewRecords = ['manager', 'ceo', 'admin'].includes(role)

  const closeMobile = () => setMobileOpen(false)
  const syncData = () => {
    window.dispatchEvent(new Event('store-sync'))
    closeMobile()
  }

  return (
    <>
      <header className="topbar">
        <button className="hamburger-button" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
          <span aria-hidden="true">☰</span>
        </button>
        <Link to="/dashboard" className="brand topbar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <span>Store Management System</span>
            <span>Inventory control</span>
          </span>
        </Link>
        <nav className="nav-links nav-center" role="navigation" aria-label="Topbar actions">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMobile}>Home</Link>
          {canViewDashboard && <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeMobile}>Dashboard</Link>}
          <Link to="/products" className={`nav-link ${location.pathname === '/products' ? 'active' : ''}`} onClick={closeMobile}>Products</Link>
          {canViewSales && <Link to="/sales" className={`nav-link ${location.pathname === '/sales' ? 'active' : ''}`} onClick={closeMobile}>Sales</Link>}
          {canViewRecords && <Link to="/records" className={`nav-link ${location.pathname === '/records' ? 'active' : ''}`} onClick={closeMobile}>Users</Link>}
          {canViewRequests && <Link to="/requests" className={`nav-link ${location.pathname === '/requests' ? 'active' : ''}`} onClick={closeMobile}>Request</Link>}
          {canViewAlerts && <Link to="/alerts" className={`nav-link nav-alert-link ${location.pathname === '/alerts' ? 'active' : ''}`} onClick={closeMobile}>Alerts{alertCount > 0 && <span className="badge">{alertCount}</span>}</Link>}
        </nav>

        <div className="nav-actions nav-right">
          {user ? (
            <div className="nav-account" ref={acctRef}>
              <button className="nav-account-toggle" onClick={() => setAcctOpen(s => !s)} aria-expanded={acctOpen} aria-label="Account menu">
                <span className="nav-account-badge">{user?.name?.charAt(0) || 'U'}</span>
                <span className="nav-account-copy">
                  <span className="nav-account-name">{user.name}</span>
                  <span className="nav-account-role">{role === 'ceo' ? 'CEO' : user.role}</span>
                </span>
              </button>
              {acctOpen && (
                <div className="account-card-wrapper">
                  <div className="profile-card">
                    <div className="profile-left">
                      <div className="profile-avatar" aria-hidden>{user?.name?.charAt(0) || 'U'}</div>
                      <div className="profile-info">
                        <div className="profile-name">{user.name}</div>
                        <div className="profile-role">{role === 'ceo' ? 'CEO' : user.role}</div>
                      </div>
                    </div>
                    <div className="profile-status"><span className="status-dot online" /> Online</div>
                    <Link to="/account" className="account-menu-item" onClick={() => { setAcctOpen(false); closeMobile(); }}>View account</Link>
                    <button className="logout-button" onClick={() => { setAcctOpen(false); logout(); }}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="button-primary">Login</Link>
          )}
        </div>
      </header>

      {mobileOpen && <button className="mobile-menu-backdrop" type="button" aria-label="Close navigation menu" onClick={closeMobile} />}

      <aside className={`mobile-menu ${mobileOpen ? 'mobile-menu--open' : ''}`} aria-hidden={!mobileOpen}>
        <div className="mobile-menu-header">
          <div>
            <div className="mobile-menu-title">Menu</div>
            <div className="mobile-menu-subtitle">Quick access to store tools</div>
          </div>
          <button className="hamburger-button mobile-menu-close" onClick={closeMobile} aria-label="Close menu">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="mobile-menu-links" role="navigation" aria-label="Mobile navigation">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMobile}>Home</Link>
          {canViewDashboard && <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeMobile}>Dashboard</Link>}
          <Link to="/products" className={`nav-link ${location.pathname === '/products' ? 'active' : ''}`} onClick={closeMobile}>Products</Link>
          {canViewSales && <Link to="/sales" className={`nav-link ${location.pathname === '/sales' ? 'active' : ''}`} onClick={closeMobile}>Sales</Link>}
          {canViewRecords && <Link to="/records" className={`nav-link ${location.pathname === '/records' ? 'active' : ''}`} onClick={closeMobile}>Users</Link>}
          {canViewRequests && <Link to="/requests" className={`nav-link ${location.pathname === '/requests' ? 'active' : ''}`} onClick={closeMobile}>Request</Link>}
          {canViewAlerts && <Link to="/alerts" className={`nav-link nav-alert-link ${location.pathname === '/alerts' ? 'active' : ''}`} onClick={closeMobile}>Alerts{alertCount > 0 && <span className="badge">{alertCount}</span>}</Link>}
        </nav>

        <div className="mobile-menu-account">
          {user ? (
            <>
              <div className="mobile-menu-account-card">
                <div className="profile-left">
                  <div className="profile-avatar" aria-hidden>{user?.name?.charAt(0) || 'U'}</div>
                  <div className="profile-info">
                    <div className="profile-name">{user.name}</div>
                    <div className="profile-role">{role === 'ceo' ? 'CEO' : user.role}</div>
                  </div>
                </div>
                <div className="profile-status"><span className="status-dot online" /> Online</div>
              </div>
              <Link to="/account" className="account-menu-item" onClick={closeMobile}>View account</Link>
              <button className="logout-button" onClick={() => { closeMobile(); logout(); }}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="button-primary" onClick={closeMobile}>Login</Link>
          )}
        </div>
      </aside>
    </>
  )
}

export default Nav
