const db = require('../src/models/db')
const { approveUser } = require('../src/controllers/userController')

jest.mock('../src/models/db')

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
      if (text.startsWith('SELECT id, role, approved, deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 11, role: 'manager', approved: false, deleted_at: null }] })
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
      if (text.startsWith('SELECT id, role, approved, deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 12, role: 'manager', approved: false, deleted_at: null }] })
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
})
