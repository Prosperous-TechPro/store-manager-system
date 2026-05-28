import React from 'react'
import { Link } from 'react-router-dom'

const items = [
  'Essential cookies may be used to keep users signed in and protect sessions.',
  'Optional analytics cookies should only be used if you clearly explain them to users.',
  'Users should be able to review cookie use through your privacy settings or policy page.',
]

const CookiePolicy = () => {
  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Cookie Policy</div>
        <h1 className="hero-title">Cookie and session policy</h1>
        <p className="hero-subtitle">A simple template for session handling and any optional tracking you may add later.</p>
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

export default CookiePolicy
