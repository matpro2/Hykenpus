// frontend/src/services/saeServices.js

export const SERVER_URL = 'https://didactic-fortnight-r47xp459jq9535477-8000.app.github.dev';
const API_BASE_URL = `${SERVER_URL}/api`; 

export const saeService = {
  
  getPublicListeSae: async () => {
    const response = await fetch(`${API_BASE_URL}/public/sae`);
    if (!response.ok) throw new Error("Erreur de chargement");
    return await response.json();
  },

  login: async (mail, password) => { 
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mail, password })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Échec de la connexion");
    }
    return await response.json(); 
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Échec de l'inscription");
    }
    return await response.json(); 
  },

  createSae: async (formData, token) => {
    const response = await fetch(`${API_BASE_URL}/sae`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData 
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Échec de la création");
    }
    return await response.json(); 
  },

  getListeSae: async (token) => {
    const options = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    const response = await fetch(`${API_BASE_URL}/sae`, options);
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    return await response.json();
  },

  // NOUVEAU : Fonction spéciale pour l'admin
  generateMockData: async (type, count, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type, count })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Échec de la génération");
    return data;
  }
};