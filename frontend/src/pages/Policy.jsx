import React from 'react'
import { Link } from 'react-router-dom'

const policySections = [
  {
    title: 'Role access',
    items: [
      'Cashier accounts are for daily sales and stock tasks.',
      'Manager accounts are reserved for supervisors who handle operations.',
      'Sales Associate accounts handle frontline sales entry.',
      'CEO accounts are reserved for business owners and full administration.',
      'Each user must keep their login details private.',
    ],
  },
  {
    title: 'Store operations',
    items: [
      'Record sales honestly and complete transactions before closing the shift.',
      'Keep stock counts updated and report shortages immediately.',
      'Follow opening and closing procedures approved by the store CEO.',
    ],
  },
  {
    title: 'Customer care',
    items: [
      'Treat customers respectfully and provide clear item prices.',
      'Handle refunds or exchanges according to store rules.',
      'Escalate disputes to a supervisor where needed.',
    ],
  },
  {
    title: 'Data and compliance',
    items: [
      'Only collect customer or employee information that is needed for business use.',
      'Keep personal data secure and confidential.',
      'Adapt this template to your company policy and any local legal requirements in Ghana, including data protection and employment rules.',
    ],
  },
]

const Policy = () => {
  return (
    <div className="page policy-page">
      <section className="hero-card policy-hero">
        <div className="auth-badge">Store policy template</div>
        <h1 className="hero-title">Policy for store operations in Ghana</h1>
        <p className="hero-subtitle">
          This is a practical policy template for a retail store. Review it with your team and adjust it to match your business rules and professional advice.
        </p>
        <div className="hero-actions">
          <Link className="button-primary" to="/login">Back to signup</Link>
          <Link className="button-secondary" to="/">Home</Link>
        </div>
      </section>

      <section className="grid-2">
        {policySections.map((section) => (
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

export default Policy
