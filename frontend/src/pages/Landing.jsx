import React, { useState } from 'react'
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

const Landing = () => {
  const token = localStorage.getItem('token')
  const [hoveredFeature, setHoveredFeature] = useState(null)

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
    </div>
  )
}

export default Landing
