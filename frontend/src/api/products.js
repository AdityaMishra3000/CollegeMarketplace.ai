import API from './client'

// Mirrors the existing Express routes exactly — no contract changes.
export const getProducts = (params = {}) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.append(k, v)
  })
  const s = qs.toString()
  return API.get(`/products${s ? `?${s}` : ''}`)
}

export const getProduct = (id) => API.get(`/products/${id}`)
export const getUserProducts = (userId) =>
  API.get(`/users/${userId}/products`)
export const createProduct = (payload) => API.post('/products', payload)
export const updateProduct = (id, payload) => API.put(`/products/${id}`, payload)
export const sellOne = (id) => API.put(`/products/${id}/sell-one`)
export const deleteProduct = (id) => API.delete(`/products/${id}`)

export const getStats = () => API.get('/stats')
export const getAdminDashboard = () => API.get('/admin/dashboard')
export const deleteUser = (id) => API.delete(`/admin/users/${id}`)
