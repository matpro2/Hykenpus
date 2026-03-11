// frontend/src/services/saeService.js

// N'oublie pas de remplacer par l'URL de ton port 8000 rendu public !
const API_URL = 'https://didactic-fortnight-r47xp459jq9535477-8000.app.github.dev/api/sae'; 

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
