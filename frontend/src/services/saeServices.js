// frontend/src/services/saeServices.js

// L'URL de ton Codespaces
const API_BASE_URL = 'https://didactic-fortnight-r47xp459jq9535477-8000.app.github.dev/api'; 

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

  // NOUVEAU : Création d'une SAE
  createSae: async (saeData, token) => {
    const response = await fetch(`${API_BASE_URL}/sae`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(saeData)
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
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/sae`, options);
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    return await response.json();
  }
};