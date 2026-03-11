// frontend/src/services/saeService.js

// ATTENTION: Pense à remettre l'URL de ton Codespaces (port 8000)
const API_BASE_URL = 'https://didactic-fortnight-r47xp459jq9535477-8000.app.github.dev/api'; 

export const saeService = {
  // Fonction pour se connecter
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error("Échec de la connexion");
    return await response.json(); // Retourne { token: "..." }
  },

  // Fonction pour récupérer les SAE (nécessite le token)
  getListeSae: async (token) => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Ajout du Token dans les headers si présent
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/sae`, options);
    
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    
    return await response.json();
  }
};