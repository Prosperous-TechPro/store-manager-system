const db = require('../src/models/db')
const sales = require('../src/controllers/salesController')

jest.mock('../src/models/db')

const makeRes = ()=>{
  const res = {}
  res.status = (code)=>{ res._status = code; return res }
  res.json = (obj)=>{ res._body = obj; return res }
  return res
}

describe('salesController.unit', ()=>{
  beforeEach(()=>{ jest.clearAllMocks() })

  test('createSale commits and returns saleId and total', async ()=>{
    const mockClient = {
      query: jest.fn()
    }
    // sequence: BEGIN, INSERT INTO sales RETURNING id,date, then inserts, updates, stock_movements, then UPDATE sales
    mockClient.query.mockImplementation(async (text, params)=>{
      if (text.startsWith('INSERT INTO sales')) return { rows:[{ id: 55, date: new Date().toISOString() }] }
      return { rows: [] }
    })
    db.pool = { connect: jest.fn(async ()=> mockClient) }

    const req = { user: { id: 7 }, body: { items: [{ product_id:1, quantity:2, price:5.0 }] } }
    const res = makeRes()
    await sales.createSale(req, res)
    expect(res._status).toBe(201)
    expect(res._body).toHaveProperty('saleId')
    expect(res._body).toHaveProperty('total')
  })
})
