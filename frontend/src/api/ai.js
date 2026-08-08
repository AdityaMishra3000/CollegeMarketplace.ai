import API from './client';

export const predictPrice = (payload) => API.post('/ai/predict-price', payload);
export const checkFraudById = (id) => API.get(`/ai/fraud-check/${id}`);
export const getRecommendations = (id) => API.get(`/ai/recommendations/${id}`);
export const getMarketInsights = () => API.get('/ai/insights');