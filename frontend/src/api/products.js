import API from './client'

/** Page size used by the marketplace grid and the admin table. */
export const PAGE_SIZE = 24

function listParams({ page = 1, limit = PAGE_SIZE, ...filters } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  if (filters.search) params.set('search', filters.search)
  // `all` is the API's documented "no filter" sentinel.
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.condition && filters.condition !== 'all') params.set('condition', filters.condition)
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.flagged) params.set('flagged', 'true')

  return params
}

/** Normalize the API's `{ products, pagination }` envelope for usePaginatedList. */
const toPage = (response) => ({
  items: response?.products ?? [],
  pagination: response?.pagination ?? null,
})

// -- PUBLIC --

export const getProducts = async (options) =>
  toPage(await API.get(`/products?${listParams(options)}`))

export const getProductById = (id) => API.get(`/products/${id}`)

export const getSellerProducts = async (userId, options) =>
  toPage(await API.get(`/users/${userId}/products?${listParams(options)}`))

// -- AUTHENTICATED --

export const createProduct = (productData) => API.post('/products', productData)

export const updateProduct = (id, productData) => API.put(`/products/${id}`, productData)

export const getUserProducts = async (options) =>
  toPage(await API.get(`/products/me?${listParams(options)}`))

export const sellOne = (id) => API.patch(`/products/${id}/sell`)

export const deleteProduct = (id) => API.delete(`/products/${id}`)

// -- ADMIN --

export const getStats = () => API.get('/admin/stats')

export const getAdminProducts = async (options) =>
  toPage(await API.get(`/admin/products?${listParams(options)}`))

/** Analyze every listing that has no fraud verdict yet, in one batched request. */
export const backfillFraud = () => API.post('/admin/fraud/backfill')

export const reanalyzeProduct = (id) => API.post(`/admin/products/${id}/reanalyze`)
