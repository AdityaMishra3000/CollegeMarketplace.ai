import API from './client'

export const predictPrice = (payload) => API.post('/ai/predict-price', payload)

/** Risk assessment for an existing listing (served from the cached verdict). */
export const checkFraudById = (id) => API.get(`/ai/fraud-check/${id}`)

/** Risk assessment for a listing that has not been published yet. */
export const checkFraudDraft = (payload) => API.post('/ai/fraud-check', payload)

export const getRecommendations = (id) => API.get(`/ai/recommendations/${id}`)

export const getMarketInsights = () => API.get('/ai/insights')

/** The canonical category/condition vocabulary. See lib/taxonomy.js. */
export const getTaxonomy = () => API.get('/meta/taxonomy')
