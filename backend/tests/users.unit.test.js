const db = require('../src/models/db')
const { approveUser } = require('../src/controllers/userController')
const { deleteAccount } = require('../src/controllers/authController')
const sms = require('../src/controllers/smsController')

jest.mock('../src/models/db')
jest.mock('../src/controllers/smsController')

const makeRes = ()=>{
  const res = {}
  res.status = (code)=>{ res._status = code; return res }
  res.json = (obj)=>{ res._body = obj; return res }
  return res
}

describe('userController.unit', ()=>{
  beforeEach(()=>{ jest.clearAllMocks() })

  test('approveUser: blocks manager approver for manager target', async ()=>{
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id, role, approved FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 11, role: 'manager', approved: false }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = { params: { id: '11' }, user: { id: 2, role: 'manager' } }
    const res = makeRes()

    await approveUser(req, res)

    expect(res._status).toBe(403)
    expect(res._body).toMatchObject({ error: 'Manager accounts must be approved by CEO' })
  })

  test('approveUser: allows CEO approver for manager target', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id, role, approved FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 12, role: 'manager', approved: false }] })
      }
      if (text.includes('UPDATE users') && params?.[1] === 12) {
        return Promise.resolve({ rows: [{ id: 12, name: 'Martha', email: 'martha@example.com', role: 'manager', approved: true }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = { params: { id: '12' }, user: { id: 1, role: 'ceo' } }
    const res = makeRes()

    await approveUser(req, res)

    expect(res._body).toMatchObject({ ok: true })
    expect(res._body.user).toMatchObject({ id: 12, role: 'manager', approved: true })
  })

  test('deleteAccount: requires a reason before deleting a user', async ()=>{
    const req = { params: { id: '12' }, user: { id: 1, role: 'ceo' }, body: { reason: '' } }
    const res = makeRes()

    await deleteAccount(req, res)

    expect(res._status).toBe(400)
    expect(res._body).toMatchObject({ error: 'Delete reason is required' })
  })

  test('deleteAccount: deletes a user when reason is provided', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id,name,email,role,phone,phone_verified,created_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 12, name: 'Martha', email: 'martha@example.com', role: 'manager', phone: '0241234567', phone_verified: true, created_at: new Date().toISOString() }] })
      }
      if (text.startsWith('DELETE FROM users')) {
        return Promise.resolve({ rows: [{ id: 12 }] })
      }
      if (text.startsWith("SELECT phone\n       FROM users\n       WHERE lower(role) IN ('ceo','owner')")) {
        return Promise.resolve({ rows: [{ phone: '+233200000000' }] })
      }
      return Promise.resolve({ rows: [] })
    })
    sms.sendTextMessage.mockResolvedValue({ ok: true, sent: true })

    const req = { params: { id: '12' }, user: { id: 1, role: 'manager' }, body: { reason: 'Left company' } }
    const res = makeRes()

    await deleteAccount(req, res)

    expect(res._body).toMatchObject({ ok: true })
    expect(res._body.user).toMatchObject({ id: 12, name: 'Martha', email: 'martha@example.com', role: 'manager' })
    expect(res._body.report.type).toBe('user_deletion')
    expect(res._body.delete_reason).toBe('Left company')
    expect(res._body.deleted_by).toBe(1)
    expect(res._body.report_delivered_to).toEqual([{ phone: '+233200000000', sent: true }])
    expect(sms.sendTextMessage).toHaveBeenCalled()
  })
})
