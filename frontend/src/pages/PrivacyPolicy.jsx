import React from 'react'
import { Link } from 'react-router-dom'

const items = [
  'We collect only the information needed to operate the store system.',
  'Personal data should be handled in line with Ghana’s Data Protection Act, 2012 (Act 843) and your internal policies.',
  'Access to account, sales, and contact data should be restricted to authorized users only.',
  'If you use tracking or analytics tools, disclose them clearly and keep consent practices simple and transparent.',
]

const PrivacyPolicy = () => {
  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Privacy Policy</div>
        <h1 className="hero-title">Privacy policy template</h1>
        <p className="hero-subtitle">Use this as a starting point and review it with a qualified adviser before publishing it publicly.</p>
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

export default PrivacyPolicy
