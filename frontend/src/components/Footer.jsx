import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const footerItems = [
  {
    title: 'Support',
    subtitle: 'Need help with the system?',
    description: 'Use the login page, review the documentation, or contact your store admin for access issues and training.',
  },
  {
    title: 'Contact',
    subtitle: 'Talk to Prosperous TechPro',
    description: 'Email: kwawulucky@gmail.com\nCall/WhatsApp: 0248699146',
  },
  {
    title: 'Documentation',
    subtitle: 'Helpful guides and compliance notes',
    description: 'See the documentation page for usage guidance and review the policy pages for privacy, terms, and cookie details.',
  },
  {
    title: 'Legal',
    subtitle: 'Policy-first setup for Ghana',
    description: ' Ghana Data Protection Act 2012 compliant. Data used for store operations only. System provided "as is".',
  },
]

const Footer = () => {
  const [hoveredFooterItem, setHoveredFooterItem] = useState(null)

  return (
    <footer className="site-footer" style={{ background: 'var(--footer-bg, #0b1220)', color: 'var(--footer-color, #f8fafc)', padding: '12px 20px' }}>
      <div className="site-footer-inner">
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {footerItems.map((item) => (
            <button
              type="button"
              className="panel feature-card feature-button"
              key={item.title}
              onMouseEnter={() => setHoveredFooterItem(item.title)}
              onMouseLeave={() => setHoveredFooterItem(null)}
              style={{
                background: hoveredFooterItem === item.title ? 'var(--accent-color, #1f2937)' : 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '4px',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <p className="feature-kicker" style={{ fontSize: '0.7rem', margin: '0 0 2px 0' }}>{item.title}</p>
              <h3 style={{ fontSize: '0.9rem', margin: '0 0 4px 0', fontWeight: '600' }}>{item.subtitle}</h3>
              {hoveredFooterItem === item.title && (
                <p className="section-note" style={{ fontSize: '0.75rem', marginTop: '4px', animation: 'fadeIn 0.3s ease', whiteSpace: 'pre-wrap' }}>
                  {item.description}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="footer-meta" style={{ paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
        
          <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>Prosperous TechPro © 2026</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
