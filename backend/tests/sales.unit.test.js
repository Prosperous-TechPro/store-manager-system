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
    // sequence: BEGIN, user lookup, INSERT INTO sales RETURNING id,date, product lookup, inserts, updates, stock_movements, then UPDATE sales
    mockClient.query.mockImplementation(async (text, params)=>{
      if (text.startsWith('SELECT id, name FROM users')) return { rows:[{ id: 7, name: 'Sam' }] }
      if (text.startsWith('SELECT id, name, quantity, selling_price, cost_price FROM products')) return { rows:[{ id: 1, name: 'Soap', quantity: 10, selling_price: 5.0, cost_price: 2.0 }] }
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
    expect(res._body).toHaveProperty('cashier_name', 'Sam')
    expect(res._body.items).toHaveLength(1)
    expect(res._body.items[0]).toMatchObject({ product_name: 'Soap', quantity: 2, unit_price: 5, line_total: 10 })
  })

  test('createSale allows amount-only sale for cashiers', async ()=>{
    const mockClient = { query: jest.fn() }
    mockClient.query.mockImplementation(async (text, params)=>{
      if (text.startsWith('SELECT id, name FROM users')) return { rows:[{ id: 9, name: 'Cashier One' }] }
      if (text.startsWith('INSERT INTO sales')) return { rows:[{ id: 77, date: new Date().toISOString() }] }
      return { rows: [] }
    })
    db.pool = { connect: jest.fn(async ()=> mockClient) }

    const req = { user: { id: 9, role: 'cashier' }, body: { amount: 123.45 } }
    const res = makeRes()
    await sales.createSale(req, res)
    expect(res._status).toBe(201)
    expect(res._body.saleId).toBe(77)
    expect(res._body.total).toBe(123.45)
    expect(res._body.items).toEqual([])
  })

  test('listSalesDetails groups sale items under each sale', async ()=>{
    db.query.mockResolvedValue({
      rows: [
        {
          sale_id: 10,
          user_id: 7,
          cashier_name: 'Sam',
          total_amount: '25.00',
          date: '2026-05-29T12:00:00.000Z',
          item_id: 1,
          quantity: 2,
          price: '5.00',
          product_id: 3,
          product_name: 'Soap',
          expiry_date: '2026-06-01',
        },
        {
          sale_id: 10,
          user_id: 7,
          cashier_name: 'Sam',
          total_amount: '25.00',
          date: '2026-05-29T12:00:00.000Z',
          item_id: 2,
          quantity: 3,
          price: '5.00',
          product_id: 4,
          product_name: 'Rice',
          expiry_date: '2026-07-01',
        },
      ]
    })

    const req = { user: { id: 7, role: 'manager' } }
    const res = makeRes()
    await sales.listSalesDetails(req, res)

    expect(res._body).toHaveLength(1)
    expect(res._body[0]).toMatchObject({ id: 10, total_amount: '25.00', cashier_name: 'Sam' })
    expect(res._body[0].items).toHaveLength(2)
    expect(res._body[0].items[0]).toMatchObject({ product_name: 'Soap', quantity: 2, line_total: 10 })
  })
})
