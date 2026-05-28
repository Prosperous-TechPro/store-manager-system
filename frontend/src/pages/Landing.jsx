import React from 'react'
import { Link } from 'react-router-dom'

const highlights = [
  { value: '24/7', label: 'Visibility into stock movement' },
  { value: '100%', label: 'One place for products and sales' },
  { value: 'Fast', label: 'Designed for busy store teams' },
]

const features = [
  {
    title: 'Clear inventory control',
    description: 'Track quantities, reorder levels, and expiry-sensitive items from a clean dashboard.',
  },
  {
    title: 'Smarter sales flow',
    description: 'Record transactions quickly and keep product quantities in sync as sales happen.',
  },
  {
    title: 'Ready for growth',
    description: 'A modern structure that can support multiple branches, reporting, and future workflows.',
  },
]

const showcase = [
  'Fresh stock visibility at a glance',
  'Low-stock alerts for better planning',
  'Simple workflows for the front desk',
  'Built for a professional retail experience',
]

const Landing = () => {
  const token = localStorage.getItem('token')

  return (
    <div className="page landing-page">
      <section className="hero-card landing-hero" id="about">
        <div className="hero-copy">
          <div className="auth-badge">Storefront experience</div>
          <h1 className="hero-title">
            Modern store management with a clean, confident retail presence.
          </h1>
          <p className="hero-subtitle">
            Store Manager helps your team keep products organized, sales moving, and stock under control.
            It is simple enough for daily use and polished enough for a professional operation.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" to={token ? '/dashboard' : '/login'}>
              {token ? 'Go to dashboard' : 'Get started'}
            </Link>
            <Link className="button-secondary" to="/products">
              Explore products
            </Link>
            <Link className="button-secondary" to="/policy">
              View policy
            </Link>
          </div>
        </div>

        <div className="hero-showcase">
          <div className="spotlight-card">
            <p className="metric-label">About the store</p>
            <h2 className="showcase-title">A tidy retail system for everyday operations</h2>
            <p className="section-note">
              Keep an eye on merchandise, manage replenishment, and stay ready for customers with a workflow that feels organized from the start.
            </p>
          </div>

          <div className="metric-grid landing-metrics">
            {highlights.map((item) => (
              <div className="metric-card metric-accent" key={item.label}>
                <div className="metric-value">{item.value}</div>
                <p className="metric-label">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid-3" id="services">
        {features.map((feature) => (
          <article className="panel feature-card" key={feature.title}>
            <p className="feature-kicker">Feature</p>
            <h3>{feature.title}</h3>
            <p className="section-note">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="showcase-band" id="why-choose-us">
        <div>
          <div className="auth-badge">Why teams like it</div>
          <h2 className="section-title">Built to make the store feel organized and modern</h2>
          <p className="section-note">
            From the first login screen to daily product updates, the interface is designed to look sharp, stay readable, and make work feel lighter.
          </p>
        </div>
        <div className="showcase-list">
          {showcase.map((item) => (
            <div className="showcase-item" key={item}>
              <span className="showcase-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid-2" id="support">
        <article className="panel">
          <p className="feature-kicker">Support</p>
          <h3>Need help with the system?</h3>
          <p className="section-note">Use the login page, review the documentation, or contact your store admin for access issues and training.</p>
        </article>
        <article className="panel" id="contact">
          <p className="feature-kicker">Contact</p>
          <h3>Talk to Prosperous TechPro</h3>
          <p className="section-note">Add your official company email, phone number, and office location here before publishing the site.</p>
        </article>
      </section>

      <section className="grid-2" id="documentation">
        <article className="panel" id="legal">
          <p className="feature-kicker">Documentation</p>
          <h3>Helpful guides and compliance notes</h3>
          <p className="section-note">See the documentation page for usage guidance and review the policy pages for privacy, terms, and cookie details.</p>
        </article>
        <article className="panel">
          <p className="feature-kicker">Legal</p>
          <h3>Policy-first setup for Ghana</h3>
          <p className="section-note">The templates are written to align with Ghana-focused operational practices, but they should still be reviewed before production use.</p>
        </article>
      </section>
    </div>
  )
}

export default Landing
