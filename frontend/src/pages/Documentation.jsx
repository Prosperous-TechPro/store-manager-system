import React from 'react'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Getting started',
    items: [
      'Create an account and choose the correct role.',
      'Use the dashboard to review sales and stock levels.',
      'Keep product information current for accurate reporting.',
    ],
  },
  {
    title: 'Role guidance',
    items: [
      'Cashier accounts handle daily sales and front-desk work.',
      'Manager accounts should be limited to trusted supervisors.',
      'Sales Associate accounts are for sales entry and customer checkout.',
      'Owner accounts should be limited to the business owner.',
      'Review access regularly to keep the store secure.',
    ],
  },
  {
    title: 'Compliance note',
    items: [
      'Review your internal rules against Ghana data protection and employment requirements.',
      'Adapt this system to your business policy before production use.',
      'Seek qualified legal advice for formal compliance decisions.',
    ],
  },
]

const Documentation = () => {
  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Documentation</div>
        <h1 className="hero-title">How to use the store system</h1>
        <p className="hero-subtitle">A short guide for teams using the platform in a Ghana-based retail environment.</p>
        <div className="hero-actions">
          <Link className="button-primary" to="/login">Create account</Link>
          <Link className="button-secondary" to="/">Back home</Link>
        </div>
      </section>

      <section className="grid-3 docs-grid">
        {sections.map((section) => (
          <article className="panel" key={section.title}>
            <h2>{section.title}</h2>
            <ul className="policy-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Documentation
