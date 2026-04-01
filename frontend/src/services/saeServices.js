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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mail, password })
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
    return await response.json(); 
  },
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData)
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
    return await response.json(); 
  },
  createSae: async (formData, token) => {
    const response = await fetch(`${API_BASE_URL}/sae`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData 
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
    return await response.json(); 
  },
  updateSae: async (saeId, formData, token) => {
    const response = await fetch(`${API_BASE_URL}/sae/${saeId}`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData 
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
    return await response.json(); 
  },
  getListeSae: async (token) => {
    const response = await fetch(`${API_BASE_URL}/sae`, {
      method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Erreur HTTP`);
    return await response.json();
  },
  getSaeDetails: async (saeId, token) => {
    const response = await fetch(`${API_BASE_URL}/sae/${saeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Impossible de charger");
    return await response.json();
  },
  soumettreRendu: async (saeId, formData, token) => {
    const response = await fetch(`${API_BASE_URL}/sae/${saeId}/rendu`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
    return await response.json(); 
  },
  generateMockData: async (type, count, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ type, count })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  },
  getAllUsers: async (token) => {
    const response = await fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error("Erreur");
    return await response.json();
  },
  impersonateUser: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/impersonate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ userId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  },
  getMyProfile: async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error("Erreur");
    return await response.json();
  },
  updateProfile: async (profileData, token) => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profileData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  },
  getAnnonces: async (token) => {
    const response = await fetch(`${API_BASE_URL}/annonces`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error("Erreur annonces");
    return await response.json();
  },
  createAnnonce: async (annonceData, token) => {
    const response = await fetch(`${API_BASE_URL}/annonces`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(annonceData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  },
  getEtudiants: async (token) => {
    const response = await fetch(`${API_BASE_URL}/enseignant/etudiants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Erreur récupération étudiants");
    return await response.json();
  },
  adminCreateUser: async (userData, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Erreur création");
    return data;
  },
  updateEtudiantClasse: async (etudiantId, nouvelleClasse, token) => {
    const response = await fetch(`${API_BASE_URL}/enseignant/etudiants/${etudiantId}/classe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nouvelleClasse })
    });
    if (!response.ok) throw new Error("Échec assignation");
    return await response.json();
  }

  , // N'oublie pas la virgule si tu es après la dernière fonction existante !
  validateSae: async (saeId, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/sae/${saeId}/validate`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error("Erreur validation");
    return await response.json();
  },
  adminUpdateUser: async (userId, userData, token) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  }
};