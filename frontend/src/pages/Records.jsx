import React, { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import useSyncRefresh from '../hooks/useSyncRefresh'

const Records = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const currentRole = currentUser?.role === 'owner' ? 'ceo' : currentUser?.role
  const canSeeDeleteReason = ['ceo', 'admin'].includes(currentRole)
  const canDeleteUsers = ['manager', 'ceo', 'admin'].includes(currentRole)
  const canApproveUsers = ['manager', 'ceo'].includes(currentRole)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load user records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useSyncRefresh(load)

  const refreshUsers = async () => {
    const data = await api.get('/users')
    setUsers(Array.isArray(data) ? data : [])
  }

  const approveUser = async (user) => {
    setError('')
    setApprovingId(user.id)
    try {
      await api.post(`/users/${user.id}/approve`)
      await refreshUsers()
    } catch (err) {
      setError(err.message || 'Failed to approve user')
    } finally {
      setApprovingId(null)
    }
  }

  const openDelete = (user) => {
    setDeleteTarget(user)
    setDeleteReason('')
    setError('')
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteReason('')
    setDeleting(false)
  }

  const confirmDelete = async (e) => {
    e.preventDefault()
    setError('')
    if (!deleteReason.trim()) {
      setError('Delete reason is required')
      return
    }

    setDeleting(true)
    try {
      await api.del(`/users/${deleteTarget.id}`, { reason: deleteReason.trim() })
      await refreshUsers()
      closeDelete()
    } catch (err) {
      setError(err.message || 'Failed to delete user')
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <div className="auth-badge">Access records</div>
          <h1 className="hero-title" style={{ fontSize: '2.1rem', marginTop: 6 }}>Site Users</h1>
          <p className="hero-subtitle">CEO and manager accounts can review people using the system and their verification status.</p>
        </div>
      </section>

      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading user records...</div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : users.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Approval</th>
                <th>Status</th>
                {canSeeDeleteReason && <th>Delete Reason</th>}
                {canApproveUsers && <th>Approve</th>}
                {canDeleteUsers && <th>Action</th>}
                <th>Created</th>
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
                  <td>{user.approved ? <span className="tag tag-success">Approved</span> : <span className="tag tag-warn">Pending</span>}</td>
                  <td>{user.deleted_at ? <span className="tag tag-danger">Deleted</span> : <span className="tag tag-success">Active</span>}</td>
                  {canSeeDeleteReason && <td>{user.delete_reason || '-'}</td>}
                  {canApproveUsers && (
                    <td>
                      {!user.deleted_at && !user.approved ? (
                        <button className="button-secondary" onClick={() => approveUser(user)} disabled={approvingId === user.id}>
                          {approvingId === user.id ? 'Approving...' : 'Approve'}
                        </button>
                      ) : (
                        <span className="section-note">{user.approved_at ? new Date(user.approved_at).toLocaleString() : '-'}</span>
                      )}
                    </td>
                  )}
                  {canDeleteUsers && (
                    <td>
                      {!user.deleted_at ? (
                        <button className="button-secondary" onClick={() => openDelete(user)}>Delete</button>
                      ) : (
                        <span className="section-note">Deleted by user {user.deleted_by || '-'}</span>
                      )}
                    </td>
                  )}
                  <td>{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No user records found.</div>
        )}
      </div>

      {deleteTarget && (
        <div className="modal">
          <div className="modal-body">
            <h2 className="modal-title">Delete user</h2>
            <p className="section-note">You are deleting {deleteTarget.name} ({deleteTarget.email}). A reason is required before this user can be removed.</p>
            <form onSubmit={confirmDelete} className="form-grid">
              <div className="form-field">
                <label>Delete reason <span className="helper-text">Required</span></label>
                <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={4} disabled={deleting} />
              </div>
              {error && <div className="error-banner">{error}</div>}
              <div className="auth-actions">
                <button type="button" className="button-secondary" onClick={closeDelete} disabled={deleting}>Cancel</button>
                <button type="submit" className="button-primary" disabled={deleting}>{deleting ? 'Deleting...' : 'Delete user'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Records