process.env.JWT_SECRET = 'testsecret'

// unit-style tests calling controller functions directly
const db = require('../src/models/db')
const sms = require('../src/controllers/smsController')
const auth = require('../src/controllers/authController')

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
      if (text.startsWith('INSERT INTO users')) return Promise.resolve({ rows: [{ id:1, name: params[0], email: params[1], role: params[3], phone: params[4], phone_verified:false }] })
      return Promise.resolve({ rows: [] })
    })
    sms.generateAndSendCode.mockResolvedValue({ ok:true, sent:false, code:'123456' })

    const req = { body: { name:'Sam', email:'s@e.com', password:'pw', phone:'+233111' } }
    const res = makeRes()
    await auth.register(req, res)
    expect(res._status).toBe(201)
    expect(res._body).toHaveProperty('email','s@e.com')
    expect(sms.generateAndSendCode).toHaveBeenCalledWith('+233111','signup')
  })

  test('verifyPhone: verifies code and updates user', async ()=>{
    db.query.mockImplementation((text, params)=>{
      if (text.startsWith('SELECT * FROM sms_verifications')) return Promise.resolve({ rows: [{ id:10, code_hash:'hash', expires_at: new Date(Date.now()+10000), verified:false }] })
      if (text.startsWith('UPDATE sms_verifications SET verified=true')) return Promise.resolve({})
      if (text.startsWith('UPDATE users SET phone_verified=true')) return Promise.resolve({})
      return Promise.resolve({ rows: [] })
    })
    // mock verifyCodeInternal to return ok
    sms.verifyCodeInternal = jest.fn().mockResolvedValue({ ok:true })

    const req = { body: { phone:'+233111', code:'123456' } }
    const res = makeRes()
    await auth.verifyPhone(req, res)
    expect(res._body).toEqual({ ok:true })
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET phone_verified=true'), ['+233111'])
  })
})
