// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService } from './services/saeServices';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [vueActuelle, setVueActuelle] = useState('public');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  
  const [saes, setSaes] = useState([]);
  const [anneeFiltre, setAnneeFiltre] = useState(''); // Filtre public

  // Chargement des données selon si on est connecté ou non
  useEffect(() => {
    if (token) {
      setVueActuelle('dashboard');
      saeService.getListeSae(token).then(setSaes).catch(handleLogout);
    } else {
      setVueActuelle('public');
      saeService.getPublicListeSae().then(setSaes).catch(console.error);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await saeService.login(username, password);
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
  // VUE 1 : PUBLIC (Galerie graphique)
  // ==========================================
  if (vueActuelle === 'public') {
    // Filtrage par année pour le public
    const saesPubliquesFiltrees = anneeFiltre 
      ? saes.filter(sae => sae.annee.toString() === anneeFiltre) 
      : saes;

    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', margin: 0 }}>MMI Hub</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>La vitrine des travaux MMI</p>
          </div>
          <button onClick={() => setVueActuelle('login')} className="btn-primary">Intranet MMI</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Galerie des Projets</h2>
          <select 
            onChange={(e) => setAnneeFiltre(e.target.value)} 
            value={anneeFiltre}
            style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)', fontFamily: 'inherit' }}
          >
            <option value="">Toutes les années</option>
            <option value="2025">Année 2025</option>
            <option value="2026">Année 2026</option>
          </select>
        </div>

        <div className="sae-list">
          {saesPubliquesFiltrees.map((sae) => (
            <div key={sae.id} className="sae-card" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={sae.image} alt={sae.titre} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{sae.titre}</h3>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{sae.annee}</span>
                </div>
                <p style={{ marginTop: '1rem' }}>{sae.description}</p>
                <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--bg-body)', borderRadius: '5px', fontSize: '0.9rem' }}>
                  <strong>🎓 Travaux réalisés :</strong><br />
                  {sae.travaux}
                </div>
              </div>
            </div>
          ))}
        </div>
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

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', justifyContent: 'center' }}>
          <button type="button" onClick={() => { setUsername('etudiant'); setPassword('mmi2026'); }} style={{ background: '#e0e7ff', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
            👨‍🎓 Étudiant
          </button>
          <button type="button" onClick={() => { setUsername('enseignant'); setPassword('prof2026'); }} style={{ background: '#e0e7ff', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
            👨‍🏫 Enseignant
          </button>
          <button type="button" onClick={() => setVueActuelle('public')} style={{ background: '#e0e7ff', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
            🌍 Public
          </button>
        </div>

        <form onSubmit={handleLogin}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          <input type="text" placeholder="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary">Valider</button>
        </form>
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