import api from './api'

export const readSalesSnapshot = async () => {
  try {
    const body = await api.get('/sales/summary')
    return {
      total_sales: Number.parseFloat(body?.total_sales || 0),
      transactions: Number.parseInt(body?.transactions || 0, 10),
      sales: [],
    }
  } catch (summaryErr) {
    try {
      const sales = await api.get('/sales')
      const salesList = Array.isArray(sales) ? sales : []
      const total_sales = salesList.reduce((sum, sale) => sum + Number.parseFloat(sale.total_amount || 0), 0)

      return {
        total_sales,
        transactions: salesList.length,
        sales: salesList,
        fallbackError: summaryErr,
      }
    } catch (salesErr) {
      console.warn('Sales snapshot unavailable, returning empty totals', summaryErr, salesErr)
      return {
        total_sales: 0,
        transactions: 0,
        sales: [],
        fallbackError: summaryErr,
        listError: salesErr,
      }
    }
  }
}
