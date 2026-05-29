import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Approvals = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const currentRole = currentUser?.role === 'owner' ? 'ceo' : currentUser?.role
  const canApprove = ['manager', 'ceo'].includes(currentRole)

  const signOutForInvalidSession = (message) => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUsers([])
    setError(message || 'Your session expired. Please sign in again.')
    window.location.href = '/login'
  }

  const loadPending = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not authenticated. Please sign in as an approved manager or CEO.')
        setUsers([])
        return
      }
      if (!canApprove) {
        setError('You do not have permission to view approval requests.')
        setUsers([])
        return
      }

      const data = await api.get('/users/pending')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Failed to load approval requests'
      if (/invalid token|missing token/i.test(msg)) {
        signOutForInvalidSession('Your session expired. Please sign in again to view approval requests.')
        return
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [canApprove])

  useEffect(() => {
    loadPending()
  }, [loadPending])
  useSyncRefresh(loadPending)

  const approveUser = async (user) => {
    setError('')
    setApprovingId(user.id)
    try {
      await api.post(`/users/${user.id}/approve`)
      await loadPending()
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Failed to approve user'
      if (/invalid token|missing token/i.test(msg)) {
        signOutForInvalidSession('Your session expired. Please sign in again to approve requests.')
        return
      }
      setError(msg)
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="page static-page">
      <section className="hero-card">
        <div className="auth-badge">Request for approval</div>
        <h1 className="hero-title">Pending account requests</h1>
        <p className="hero-subtitle">CEO and manager accounts can approve most signups before access is granted. Manager-role accounts require CEO approval.</p>
      </section>

      {loading ? (
        <div className="loading-state">Loading request queue...</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : users.length ? (
        <div className="approval-layout">
          <div className="approval-table table-card">
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
                    {canApprove ? (
                      <button className="button-primary" onClick={() => approveUser(user)} disabled={approvingId === user.id}>
                        {approvingId === user.id ? 'Approving...' : 'Approve'}
                      </button>
                    ) : (
                      <span className="section-note">Insufficient privileges</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="approval-list">
            {users.map((user) => (
              <article key={`card-${user.id}`} className="approval-card panel">
                <div className="approval-card-head">
                  <div>
                    <h2 className="approval-card-title">{user.name}</h2>
                    <p className="section-note">{user.email}</p>
                  </div>
                  <span className="tag tag-role">Role: {user.role}</span>
                </div>

                <div className="approval-card-body">
                  <div>
                    <span className="approval-label">Phone</span>
                    <div>{user.phone || '-'}</div>
                  </div>
                  <div>
                    <span className="approval-label">Phone verified</span>
                    <div>{user.phone_verified ? <span className="tag tag-success">Yes</span> : <span className="tag tag-warn">No</span>}</div>
                  </div>
                  <div>
                    <span className="approval-label">Requested</span>
                    <div>{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</div>
                  </div>
                </div>

                <div className="approval-card-actions">
                  {canApprove ? (
                    <button className="button-primary" onClick={() => approveUser(user)} disabled={approvingId === user.id}>
                      {approvingId === user.id ? 'Approving...' : 'Approve request'}
                    </button>
                  ) : (
                    <span className="section-note">Insufficient privileges</span>
                  )}
                </div>
              </article>
            ))}
          </div>
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