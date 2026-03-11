// frontend/src/services/saeService.js

// ATTENTION : Dans Codespaces, remplace localhost par l'URL exacte de ton API
// que tu avais dans la barre d'adresse (ex: https://automatic-space...8000.app.github.dev/api/sae)
const API_URL = 'https://automatic-space-umbrella-wrv4grq6wqjphgvrg-8000.app.github.dev/api/sae'; 

export const saeService = {
  getListeSae: async () => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(API_URL, options);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  }
};
