import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Approvals = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [approvingId, setApprovingId] = useState(null)

  const loadPending = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/users/pending')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load approval requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const approveUser = async (user) => {
    setError('')
    setApprovingId(user.id)
    try {
      await api.post(`/users/${user.id}/approve`)
      await loadPending()
    } catch (err) {
      setError(err.message || 'Failed to approve user')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Request for approval</div>
        <h1 className="hero-title">Pending account requests</h1>
        <p className="hero-subtitle">CEO and manager accounts can approve new signups before they gain access to the site.</p>
      </section>

      {loading ? (
        <div className="loading-state">Loading request queue...</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : users.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Phone Verified</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td><span className="tag tag-role">Role: {user.role}</span></td>
                  <td>{user.phone_verified ? <span className="tag tag-success">Yes</span> : <span className="tag tag-warn">No</span>}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</td>
                  <td>
                    <button className="button-primary" onClick={() => approveUser(user)} disabled={approvingId === user.id}>
                      {approvingId === user.id ? 'Approving...' : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <p className="section-note">No pending approval</p>
        </div>
      )}
    </div>
  )
}

export default Approvals