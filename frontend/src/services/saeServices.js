// frontend/src/services/saeServices.js

// L'URL de ton Codespaces
const API_BASE_URL = 'https://didactic-fortnight-r47xp459jq9535477-8000.app.github.dev/api'; 

export const saeService = {
  // NOUVEAU : Fonction publique (sans token)
  getPublicListeSae: async () => {
    const response = await fetch(`${API_BASE_URL}/public/sae`);
    if (!response.ok) throw new Error("Erreur de chargement public");
    return await response.json();
  },

  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error("Échec de la connexion");
    return await response.json(); 
  },

  getListeSae: async (token) => {
    const options = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/sae`, options);
    
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    
    return await response.json();
  }
};