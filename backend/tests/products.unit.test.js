const db = require('../src/models/db')
const products = require('../src/controllers/productController')

jest.mock('../src/models/db')

const makeRes = ()=>{
  const res = {}
  res.status = (code)=>{ res._status = code; return res }
  res.json = (obj)=>{ res._body = obj; return res }
  res.send = () => res
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

  test('deleteProduct rejects non-expired products with quantity above zero', async ()=>{
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, expiry_date: '2026-12-31', quantity: 5 }] })

    const req = { params: { id: '1' } }
    const res = makeRes()
    await products.deleteProduct(req, res)

    expect(res._status).toBe(400)
    expect(res._body).toEqual({ error: 'Only expired or zero-quantity products can be deleted' })
  })

  test('deleteProduct allows zero-quantity products to be deleted', async ()=>{
    db.query.mockResolvedValueOnce({ rows: [{ id: 2, expiry_date: '2026-12-31', quantity: 0 }] })
    db.query.mockResolvedValueOnce({ rows: [] })

    const req = { params: { id: '2' } }
    const res = makeRes()
    await products.deleteProduct(req, res)

    expect(res._status).toBe(204)
  })
})
