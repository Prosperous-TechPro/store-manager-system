process.env.JWT_SECRET = 'testsecret'

// unit-style tests calling controller functions directly
const db = require('../src/models/db')
const sms = require('../src/controllers/smsController')
const auth = require('../src/controllers/authController')
const bcrypt = require('bcrypt')

jest.mock('../src/models/db')
jest.mock('../src/controllers/smsController')

const makeRes = ()=>{
  const res = {}
  res.status = (code)=>{ res._status = code; return res }
  res.json = (obj)=>{ res._body = obj; return res }
  return res
}

describe('authController.unit', ()=>{
  beforeEach(()=>{ jest.clearAllMocks() })

  test('register: creates user and triggers SMS', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id FROM users WHERE email')) return Promise.resolve({ rows: [] })
      if (text.startsWith('INSERT INTO users')) return Promise.resolve({ rows: [{ id:1, name: params[0], email: params[1], role: params[3], phone: params[4], phone_verified:false, approved:false }] })
      return Promise.resolve({ rows: [] })
    })
    sms.generateAndSendCode.mockResolvedValue({ ok:true, sent:false, code:'123456' })

    const req = { body: { name:'Sam', email:'s@e.com', password:'TestPass123!', phone:'+233241234567' } }
    const res = makeRes()
    await auth.register(req, res)
    expect(res._status).toBe(201)
    expect(res._body).toHaveProperty('email','s@e.com')
    expect(res._body.approved).toBe(false)
    expect(res._body.approval_required).toBe(true)
    expect(sms.generateAndSendCode).toHaveBeenCalledWith('+233241234567','signup')
  })

  test('register: auto-approves CEO accounts', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id FROM users WHERE lower(email)=lower($1)')) return Promise.resolve({ rows: [] })
      if (text.startsWith('SELECT id FROM users WHERE phone=$1')) return Promise.resolve({ rows: [] })
      if (text.startsWith("SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL AND lower(role) IN ('ceo','owner')")) return Promise.resolve({ rows: [{ total: 2 }] })
      if (text.startsWith('INSERT INTO users')) return Promise.resolve({ rows: [{ id:1, name: params[0], email: params[1], role: params[3], phone: params[4], phone_verified:false, approved:true }] })
      return Promise.resolve({ rows: [] })
    })
    sms.generateAndSendCode.mockResolvedValue({ ok:true, sent:false, code:'123456' })

    const req = { body: { name:'Chief', email:'ceo@example.com', password:'TestPass123!', phone:'+233241234567', role:'ceo' } }
    const res = makeRes()
    await auth.register(req, res)

    expect(res._status).toBe(201)
    expect(res._body.approved).toBe(true)
    expect(res._body.approval_required).toBe(false)
    expect(sms.generateAndSendCode).toHaveBeenCalledWith('+233241234567','signup')
  })

  test('register: blocks CEO account when 3 CEO accounts already exist', async ()=>{
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id FROM users WHERE lower(email)=lower($1)')) return Promise.resolve({ rows: [] })
      if (text.startsWith('SELECT id FROM users WHERE phone=$1')) return Promise.resolve({ rows: [] })
      if (text.startsWith("SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL AND lower(role) IN ('ceo','owner')")) {
        return Promise.resolve({ rows: [{ total: 3 }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = { body: { name:'Chief Two', email:'ceo2@example.com', password:'TestPass123!', phone:'+233241234567', role:'ceo' } }
    const res = makeRes()
    await auth.register(req, res)

    expect(res._status).toBe(403)
    expect(res._body).toMatchObject({ error: 'cant create account, consult the manager' })
    expect(sms.generateAndSendCode).not.toHaveBeenCalled()
  })

  test('verifyPhone: verifies code and updates user', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT * FROM sms_verifications')) return Promise.resolve({ rows: [{ id:10, code_hash:'hash', expires_at: new Date(Date.now()+10000), verified:false }] })
      if (text.startsWith('UPDATE sms_verifications SET verified=true')) return Promise.resolve({})
      if (text.startsWith('UPDATE users SET phone_verified=true')) return Promise.resolve({})
      if (text.startsWith('SELECT id,name,email,role,phone,approved FROM users WHERE phone=$1')) return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', role: 'manager', phone: '+233241234567', approved: true }] })
      return Promise.resolve({ rows: [] })
    })
    // mock verifyCodeInternal to return ok
    sms.verifyCodeInternal = jest.fn().mockResolvedValue({ ok:true })

    const req = { body: { phone:'+233241234567', code:'123456' } }
    const res = makeRes()
    await auth.verifyPhone(req, res)
    expect(res._body).toMatchObject({ ok:true, user: { id: 1, name: 'Sam', email: 's@e.com', role: 'manager', phone: '+233241234567' } })
    expect(res._body.token).toBeTruthy()
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET phone_verified=true'), ['+233241234567'])
  })

  test('login: blocks unapproved accounts before access', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id,name,email,password,role,phone,phone_verified,approved,deleted_at FROM users WHERE lower(email)=lower($1)')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', password: currentHash, role: 'manager', phone: '+233241234567', phone_verified: true, approved: false, deleted_at: null }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = { body: { email: 's@e.com', password: 'OldPass123!' } }
    const res = makeRes()
    await auth.login(req, res)

    expect(res._status).toBe(403)
    expect(res._body).toMatchObject({ approval_required: true })
  })

  test('updateMe: updates name and password directly when contact details do not change', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', password: currentHash, role: 'manager', phone: '+233241234567', phone_verified: true }] })
      }
      if (text.startsWith('UPDATE users')) return Promise.resolve({ rows: [{ id: 1, name: 'Samuel', email: 's@e.com', role: 'manager', phone: '+233241234567', phone_verified: true, created_at: new Date().toISOString() }] })
      return Promise.resolve({ rows: [] })
    })

    const req = {
      user: { id: 1 },
      body: {
        name: 'Samuel',
        phone: '+233241234567',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!'
      }
    }
    const res = makeRes()
    await auth.updateMe(req, res)

    expect(res._body).toMatchObject({ name: 'Samuel', email: 's@e.com', phone: '+233241234567', password_updated: true, otp_required: false })
    const updateCall = db.query.mock.calls.find(([text]) => text.includes('UPDATE users'))
    expect(updateCall).toBeTruthy()
    expect(updateCall[1][1]).not.toBe('NewPass123!')
    expect(updateCall[1][1]).toBeTruthy()
  })

  test('updateMe: stages email or phone changes behind OTP verification', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', password: currentHash, role: 'manager', phone: '+233241234567', phone_verified: true }] })
      }
      if (text.startsWith('SELECT id FROM users WHERE lower(email)=lower($1) AND id <> $2')) return Promise.resolve({ rows: [] })
      if (text.startsWith('SELECT id FROM users WHERE phone=$1 AND id <> $2')) return Promise.resolve({ rows: [] })
      if (text.startsWith('DELETE FROM account_update_requests')) return Promise.resolve({})
      if (text.startsWith('INSERT INTO account_update_requests')) return Promise.resolve({})
      return Promise.resolve({ rows: [] })
    })
    sms.generateAndSendCode.mockResolvedValue({ ok:true, sent:false, code:'123456' })

    const req = {
      user: { id: 1 },
      body: {
        name: 'Samuel',
        email: 'samuel@example.com',
        phone: '+233244567890',
        currentPassword: 'OldPass123!'
      }
    }
    const res = makeRes()
    await auth.updateMe(req, res)

    expect(res._body).toMatchObject({ ok:true, otp_required:true, otp_phone: '+233244567890' })
    expect(sms.generateAndSendCode).toHaveBeenCalledWith('+233244567890', 'profile_update')
  })

  test('verifyMeUpdate: applies staged account changes after OTP verification', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id,user_id,name,email,phone,password_hash,otp_phone,expires_at FROM account_update_requests WHERE user_id=$1')) {
        return Promise.resolve({ rows: [{ id: 9, user_id: 1, name: 'Samuel', email: 'samuel@example.com', phone: '+233244567890', password_hash: currentHash, otp_phone: '+233244567890', expires_at: new Date(Date.now() + 10000).toISOString() }] })
      }
      if (text.startsWith('SELECT id FROM users WHERE lower(email)=lower($1) AND id <> $2')) return Promise.resolve({ rows: [] })
      if (text.startsWith('SELECT id FROM users WHERE phone=$1 AND id <> $2')) return Promise.resolve({ rows: [] })
      if (text.startsWith('UPDATE users')) return Promise.resolve({ rows: [{ id: 1, name: 'Samuel', email: 'samuel@example.com', role: 'manager', phone: '+233244567890', phone_verified: true, created_at: new Date().toISOString() }] })
      if (text.startsWith('UPDATE account_update_requests SET verified=true')) return Promise.resolve({})
      return Promise.resolve({ rows: [] })
    })
    sms.verifyCodeInternal = jest.fn().mockResolvedValue({ ok:true })

    const req = { user: { id: 1 }, body: { code: '123456' } }
    const res = makeRes()
    await auth.verifyMeUpdate(req, res)

    expect(res._body).toMatchObject({ ok:true, name: 'Samuel', email: 'samuel@example.com', phone: '+233244567890' })
    expect(sms.verifyCodeInternal).toHaveBeenCalledWith('+233244567890', '123456', 'profile_update')
  })

  test('resetPassword: updates password and returns a login session', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT id,name,email,role,phone,approved,deleted_at FROM users WHERE lower(email)=lower($1)')) {
          return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', role: 'manager', phone: '+233241234567', approved: true, deleted_at: null }] })
      }
      if (text.startsWith('UPDATE users SET password=$1 WHERE id=$2')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', role: 'manager', phone: '+233241234567' }] })
      }
      return Promise.resolve({ rows: [] })
    })
    sms.verifyCodeInternal = jest.fn().mockResolvedValue({ ok:true })

    const req = { body: { email: 's@e.com', code: '123456', newPassword: 'NewPass123!' } }
    const res = makeRes()
    await auth.resetPassword(req, res)

    expect(res._body.ok).toBe(true)
    expect(res._body.token).toBeTruthy()
    expect(res._body.user).toMatchObject({ id: 1, name: 'Sam', email: 's@e.com', role: 'manager', phone: '+233241234567' })
    expect(sms.verifyCodeInternal).toHaveBeenCalledWith('+233241234567', '123456', 'password_reset')
  })

  test('updateMe: allows name changes without current password', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', password: currentHash, role: 'manager', phone: '+233241234567', phone_verified: true }] })
      }
      if (text.startsWith('UPDATE users')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Samuel', email: 's@e.com', role: 'manager', phone: '+233241234567', phone_verified: true, created_at: new Date().toISOString() }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = {
      user: { id: 1 },
      body: {
        name: 'Samuel',
        email: 's@e.com',
        phone: '+233241234567'
      }
    }
    const res = makeRes()
    await auth.updateMe(req, res)

    expect(res._body).toMatchObject({ name: 'Samuel', email: 's@e.com', phone: '+233241234567', otp_required: false })
    expect(res._body.error).toBeUndefined()
  })

  test('updateMe: still requires current password for password changes', async ()=>{
    const currentHash = bcrypt.hashSync('OldPass123!', 10)
    db.query.mockImplementation((text)=>{
      if (text.startsWith('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE id=$1')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Sam', email: 's@e.com', password: currentHash, role: 'manager', phone: '+233241234567', phone_verified: true }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const req = {
      user: { id: 1 },
      body: {
        name: 'Sam',
        email: 's@e.com',
        phone: '+233241234567',
        newPassword: 'NewPass123!'
      }
    }
    const res = makeRes()
    await auth.updateMe(req, res)

    expect(res._status).toBe(400)
    expect(res._body).toMatchObject({ error: 'Current password is required to confirm password changes' })
  })
})
