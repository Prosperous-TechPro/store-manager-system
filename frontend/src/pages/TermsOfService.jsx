import React from 'react'
import { Link } from 'react-router-dom'

const items = [
  'Users must provide accurate registration details and keep passwords secure.',
  'Cashier access is for operational work; manager, sales associate, and CEO access follow business approval.',
  'Misuse of the platform, unauthorized access, or data tampering is prohibited.',
  'This template should be aligned with your company rules and any applicable Ghana laws before launch.',
]

const TermsOfService = () => {
  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Terms of Service</div>
        <h1 className="hero-title">Terms for using the platform</h1>
        <p className="hero-subtitle">A practical template for retail teams that need clear usage rules.</p>
        <div className="hero-actions">
          <Link className="button-primary" to="/login">Back to login</Link>
          <Link className="button-secondary" to="/">Home</Link>
        </div>
      </section>

      <section className="panel">
        <ul className="policy-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  )
}

export default TermsOfService
