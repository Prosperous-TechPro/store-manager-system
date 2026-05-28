import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <h2>Prosperous TechPro</h2>
            <p>Retail systems built for modern store operations in Ghana.</p>
          </div>
        </div>

        <div className="footer-grid">
          <div>
            <h3>Company</h3>
            <Link to="/#about">About Us</Link>
            <Link to="/#services">Services</Link>
            <Link to="/#why-choose-us">Why Choose Us</Link>
          </div>
          <div>
            <h3>Support</h3>
            <Link to="/#support">Support</Link>
            <Link to="/#contact">Contact</Link>
            <Link to="/documentation">Documentation</Link>
          </div>
          <div>
            <h3>Legal</h3>
            <Link to="/policy">Legal</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/cookie-policy">Cookie Policy</Link>
          </div>
        </div>

        <div className="footer-meta">
          <p>© 2026 Prosperous TechPro. All rights reserved.</p>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
