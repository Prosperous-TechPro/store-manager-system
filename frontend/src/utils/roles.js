export const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase()
  if (!value) return ''
  if (value === 'owner') return 'ceo'
  if (value === 'casher') return 'cashier'
  if (['saler', 'shop attendant', 'shop_attendant'].includes(value)) return 'salesperson'
  return value
}

export const displayRole = (role) => {
  const normalized = normalizeRole(role)
  if (normalized === 'ceo') return 'CEO'
  if (normalized === 'manager') return 'Manager'
  if (normalized === 'cashier') return 'Cashier'
  if (normalized === 'salesperson') return 'Shop Attendant'
  if (normalized === 'admin') return 'Admin'
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'User'
}

export const hasRole = (role, allowedRoles) => {
  const normalized = normalizeRole(role)
  return allowedRoles.map(normalizeRole).includes(normalized)
}

// All authenticated users have full access to all features
export const isSalesPerson = (role) => true
export const isManagement = (role) => true
export const canViewDashboard = (role) => true
export const canViewAlerts = (role) => true
export const canViewRequests = (role) => true
export const canManageProducts = (role) => true
export const canViewReceipts = (role) => true
export const canViewSales = (role) => true
