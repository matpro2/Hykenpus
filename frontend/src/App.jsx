// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService } from './services/saeServices';
import './App.css';

function App() {
  // États pour l'authentification
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // États pour les données
  const [saes, setSaes] = useState([]);
  const [erreur, setErreur] = useState(null);

  // Fonction de connexion
  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await saeService.login(username, password);
      setToken(data.token);
      localStorage.setItem('jwtToken', data.token); // On stocke le JWT
    } catch (err) {
      setErreur("Identifiants incorrects.");
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('jwtToken');
    setSaes([]);
  };

  // Chargement des SAE uniquement si on a un token
  useEffect(() => {
    if (token) {
      const chargerSae = async () => {
        try {
          const donnees = await saeService.getListeSae(token);
          setSaes(donnees);
        } catch (err) {
          setErreur("Impossible de charger les SAE. Session expirée ?");
          handleLogout(); // Si le token est invalide/expiré, on déconnecte
        }
      };
      chargerSae();
    }
  }, [token]);

  // --- VUE 1 : Formulaire de connexion ---
// --- VUE 1 : Formulaire de connexion ---
  if (!token) {
    return (
      <div className="login-wrapper">
        <h1>Connexion MMI</h1>
        <form onSubmit={handleLogin}>
          {erreur && <p style={{ color: '#ef4444', fontWeight: '500' }}>{erreur}</p>}
          <input 
            type="text" 
            placeholder="Nom d'utilisateur" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary">Se connecter</button>
        </form>
      </div>
    );
  }

  // --- VUE 2 : Tableau de bord sécurisé ---
  return (
    <div className="dashboard-container">
      <div className="header-dashboard">
        <h1>Suivi des SAE</h1>
        <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
      </div>
      
      <h2>Vue Étudiant : Tableau de bord</h2>

      {erreur && <p style={{ color: '#ef4444' }}>{erreur}</p>}

      <div className="sae-list">
        {saes.length === 0 && !erreur ? (
          <p>Chargement des SAE...</p>
        ) : (
          saes.map((sae) => (
            <div key={sae.id} className="sae-card">
              <h3>{sae.titre}</h3>
              <p><strong>Description :</strong> {sae.description}</p>
              <p><strong>Semestre :</strong> {sae.semestre}</p>
              <p><strong>État :</strong> {sae.etat}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;