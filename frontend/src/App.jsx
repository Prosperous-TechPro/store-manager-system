import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import VerifyAccount from './pages/VerifyAccount'
import ForgotPassword from './pages/ForgotPassword'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'
import DashboardDetails from './pages/DashboardDetails'
import AlertsDetails from './pages/AlertsDetails'
import Sales from './pages/Sales'
import Records from './pages/Records'
import Alerts from './pages/Alerts'
import ReceiptPreview from './components/ReceiptPreview'
import Approvals from './pages/Approvals'
import Products from './pages/Products'
import Receipts from './pages/Receipts'
import Policy from './pages/Policy'
import Documentation from './pages/Documentation'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import CookiePolicy from './pages/CookiePolicy'
import Nav from './components/Nav'
import Footer from './components/Footer'

const App = () => {
  // All authenticated users have access to all features
  const [sidebarOpen] = useState(false)
  const token = localStorage.getItem('token')
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
    <div className={`app-shell`}>
      <Nav />
      <main className="app-main">
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
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/dashboard/:metricId" element={token ? <DashboardDetails /> : <Navigate to="/login" />} />
        <Route path="/alerts" element={token ? <Alerts /> : <Navigate to="/login" />} />
        <Route path="/alerts/:metricId" element={token ? <AlertsDetails /> : <Navigate to="/login" />} />
        <Route path="/requests" element={token ? <Approvals /> : <Navigate to="/login" />} />
        <Route path="/approvals" element={<Navigate to="/requests" replace />} />
        <Route path="/products" element={token ? <Products /> : <Navigate to="/login" />} />
        <Route path="/receipt/:id" element={token ? <ReceiptPreview /> : <Navigate to="/login" />} />
        <Route path="/sales" element={token ? <Sales /> : <Navigate to="/login" />} />
        <Route path="/receipts" element={token ? <Receipts /> : <Navigate to="/login" />} />
        <Route path="/records" element={token ? <Records /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </main>
      {location.pathname === '/' && <Footer />}
    </div>
  )
}

export default App
