import API from './client'

// -- PUBLIC ROUTES --

export const getProducts = async (filters = {}) => {
  // We use URLSearchParams to cleanly build the query string (e.g., ?search=laptop&category=electronics)
  const params = new URLSearchParams()
  
  if (filters.search) params.append('search', filters.search)
  if (filters.category && filters.category !== 'all') params.append('category', filters.category)
  if (filters.condition && filters.condition !== 'all') params.append('condition', filters.condition)

  return API.get(`/products?${params.toString()}`)
}

export const getProductById = async (id) => {
  return API.get(`/products/${id}`)
}


// -- PROTECTED USER ROUTES (Requires JWT) --

export const createProduct = async (productData) => {
  return API.post('/products', productData)
}

export const getUserProducts = async () => {
  return API.get('/products/me')
}

export const sellOne = async (id) => {
  // Using PATCH because we are just updating the 'isSold' status, not replacing the whole object
  return API.patch(`/products/${id}/sell`)
}

export const deleteProduct = async (id) => {
  return API.delete(`/products/${id}`)
}


// -- ADMIN ROUTES --

export const getStats = async () => {
  return API.get('/admin/stats')
}

export const getAdminDashboard = async () => {
  return API.get('/admin/products')
}