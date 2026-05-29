import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import VerifyAccount from './pages/VerifyAccount'
import ForgotPassword from './pages/ForgotPassword'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import Alerts from './pages/Alerts'
import Approvals from './pages/Approvals'
import Products from './pages/Products'
import Policy from './pages/Policy'
import Documentation from './pages/Documentation'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import CookiePolicy from './pages/CookiePolicy'
import Nav from './components/Nav'
import Footer from './components/Footer'

const App = () => {
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const currentRole = currentUser?.role === 'owner' ? 'ceo' : currentUser?.role
  const canViewManagement = ['manager', 'ceo', 'admin'].includes(currentRole)
  const canViewAlerts = ['manager', 'ceo', 'admin'].includes(currentRole)
  const canViewApprovals = ['manager', 'ceo'].includes(currentRole)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    const element = document.getElementById(id)
    if (element) {
      requestAnimationFrame(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [location])

  return (
    <div>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-account" element={<VerifyAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/account" element={token ? <Account /> : <Navigate to="/login" />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/dashboard" element={token ? (canViewManagement ? <Dashboard /> : <Navigate to="/products" replace />) : <Navigate to="/login" />} />
        <Route path="/alerts" element={token ? (canViewAlerts ? <Alerts /> : <Navigate to="/products" replace />) : <Navigate to="/login" />} />
        <Route path="/approvals" element={token ? (canViewApprovals ? <Approvals /> : <Navigate to="/products" replace />) : <Navigate to="/login" />} />
        <Route path="/products" element={token ? <Products /> : <Navigate to="/login" />} />
        <Route path="/records" element={token ? (canViewManagement ? <Records /> : <Navigate to="/products" replace />) : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
