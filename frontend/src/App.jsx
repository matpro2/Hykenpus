import { useState, useEffect } from 'react';
import { saeService } from './services/saeServices';
import './App.css';

function App() {
  // États de l'application
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [vueActuelle, setVueActuelle] = useState('public'); // 'public', 'login', ou 'dashboard'

  // États du formulaire
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  
  // Données
  const [saes, setSaes] = useState([]);

  // Au chargement, si on a un token, on va direct au dashboard
  useEffect(() => {
    if (token) {
      setVueActuelle('dashboard');
      const chargerSae = async () => {
        try {
          const donnees = await saeService.getListeSae(token);
          setSaes(donnees);
        } catch (err) {
          handleLogout();
        }
      };
      chargerSae();
    } else {
      setVueActuelle('public');
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await saeService.login(username, password);
      // On sauvegarde le token ET le rôle
      setToken(data.token);
      setRole(data.role);
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('userRole', data.role);
    } catch (err) {
      setErreur("Identifiants incorrects.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
    setSaes([]);
    setVueActuelle('public');
    setUsername('');
    setPassword('');
  };

  // ==========================================
  // VUE 1 : PUBLIC (Par défaut)
  // ==========================================
  if (vueActuelle === 'public') {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--primary)' }}>Bienvenue sur MMI Hub</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          La plateforme de suivi des Situations d'Apprentissage et d'Évaluation.
        </p>
        <button onClick={() => setVueActuelle('login')} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>
          Se connecter à l'intranet
        </button>
      </div>
    );
  }

  // ==========================================
  // VUE 2 : CONNEXION
  // ==========================================
  if (vueActuelle === 'login') {
    return (
      <div className="login-wrapper">
        <h1>Connexion</h1>

        {/* --- NOUVEAU : Boutons de remplissage rapide pour la démo --- */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={() => { setUsername('etudiant'); setPassword('mmi2026'); }} 
            style={{ background: '#e0e7ff', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            👨‍🎓 Étudiant
          </button>
          <button 
            type="button" 
            onClick={() => { setUsername('enseignant'); setPassword('prof2026'); }} 
            style={{ background: '#e0e7ff', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            👨‍🏫 Enseignant
          </button>
        </div>

        <form onSubmit={handleLogin}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          <input 
            type="text" 
            placeholder="Identifiant" 
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
          <button type="submit" className="btn-primary">Valider</button>
        </form>

        {/* Le raccourci Public agit comme un bouton retour */}
        <button 
          onClick={() => setVueActuelle('public')} 
          style={{ background: 'none', color: 'var(--text-muted)', marginTop: '1.5rem', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}
        >
          👁️ Retour à la vue Public
        </button>
      </div>
    );
  }

  // ==========================================
  // VUE 3 : TABLEAU DE BORD (Protégé)
  // ==========================================
  return (
    <div className="dashboard-container">
      <div className="header-dashboard">
        <h1>Suivi des SAE</h1>
        <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
      </div>
      
      {/* Affichage dynamique selon le rôle */}
      <h2>
        Vue {role === 'enseignant' ? 'Enseignant' : 'Étudiant'} : 
        {role === 'enseignant' ? ' Supervision globale' : ' Mon tableau de bord'}
      </h2>

      <div className="sae-list">
        {saes.length === 0 ? (
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