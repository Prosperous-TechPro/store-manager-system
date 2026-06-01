const db = require('../src/models/db')
const products = require('../src/controllers/productController')

jest.mock('../src/models/db')

const makeRes = ()=>{
  const res = {}
  res.status = (code)=>{ res._status = code; return res }
  res.json = (obj)=>{ res._body = obj; return res }
  return res
}

describe('productController.unit', ()=>{
  beforeEach(()=>{ jest.clearAllMocks() })

  test('listProducts returns rows', async ()=>{
    const rows = [{ id:1, name:'Milk', quantity:5, supplier_name:'S1' }]
    db.query.mockResolvedValue({ rows })
    const req = {}
    const res = makeRes()
    await products.listProducts(req, res)
    expect(res._body).toBe(rows)
  })

  test('deleteProduct rejects non-expired products', async ()=>{
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, expiry_date: '2026-12-31' }] })

    const req = { params: { id: '1' }, user: { role: 'manager' } }
    const res = makeRes()
    await products.deleteProduct(req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({ error: 'Only expired products can be deleted' })
  })
})
