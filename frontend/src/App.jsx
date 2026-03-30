// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService, SERVER_URL } from './services/saeServices';
import './App.css';

const CLASSES_DISPOS = ['MMI-A1', 'MMI-A2', 'MMI-B1', 'MMI-B2', 'MMI-C1', 'MMI-C2'];

function App() {
  // --- ÉTATS D'AUTHENTIFICATION & NAVIGATION ---
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [prenomUser, setPrenomUser] = useState(localStorage.getItem('userPrenom') || '');
  const [vueActuelle, setVueActuelle] = useState('public');
  const [loading, setLoading] = useState(false);

  // --- ÉTAT DU THÈME (MODE SOMBRE) ---
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  // --- ÉTATS FORMULAIRES ---
  const [identifiant, setIdentifiant] = useState(''); // Utilisé pour Email ou Login
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [roleInscription, setRoleInscription] = useState('etudiant');
  const [classeInscription, setClasseInscription] = useState(CLASSES_DISPOS[0]);

  const [nomSae, setNomSae] = useState('');
  const [descriptionSae, setDescriptionSae] = useState('');
  const [dateRenduSae, setDateRenduSae] = useState('');
  const [classeCible, setClasseCible] = useState('Toutes');
  const [fichiersSae, setFichiersSae] = useState([]);

  // --- ÉTATS DATA & UI ---
  const [saes, setSaes] = useState([]);
  const [listeUtilisateurs, setListeUtilisateurs] = useState([]);
  const [quantiteGeneration, setQuantiteGeneration] = useState(10);
  const [triDate, setTriDate] = useState('asc');
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  // --- LOGIQUE DU THÈME ---
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- LOGIQUE INITIALE (CHARGEMENT DATA) ---
  useEffect(() => {
    setLoading(true);
    setErreur(null);
    if (token) {
      if (['public', 'login', 'register'].includes(vueActuelle)) {
        setVueActuelle('dashboard');
      }
      saeService.getListeSae(token)
        .then(setSaes)
        .catch(handleLogout)
        .finally(() => setLoading(false));

      if (vueActuelle === 'admin' && role === 'admin') {
        saeService.getAllUsers(token).then(setListeUtilisateurs).catch(console.error);
      }
    } else {
      setVueActuelle(prev => ['dashboard', 'create-sae', 'admin'].includes(prev) ? 'public' : prev);
      saeService.getPublicListeSae()
        .then(setSaes)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token, vueActuelle, role]);

  // --- HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      // On envoie "identifiant" au champ attendu par l'API (mail)
      const data = await saeService.login(identifiant, password);
      setToken(data.token); setRole(data.role); setPrenomUser(data.prenom);
      localStorage.setItem('jwtToken', data.token); 
      localStorage.setItem('userRole', data.role); 
      localStorage.setItem('userPrenom', data.prenom);
      setIdentifiant(''); setPassword('');
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      await saeService.register({ nom, prenom, mail: identifiant, password, role: roleInscription, classe: classeInscription });
      const data = await saeService.login(identifiant, password);
      setToken(data.token); setRole(data.role); setPrenomUser(data.prenom);
      localStorage.setItem('jwtToken', data.token); localStorage.setItem('userRole', data.role); localStorage.setItem('userPrenom', data.prenom);
      setIdentifiant(''); setPassword('');
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleCreateSae = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const formData = new FormData();
      formData.append('nom', nomSae);
      formData.append('description', descriptionSae);
      formData.append('date_rendu', dateRenduSae);
      formData.append('classe_cible', classeCible);
      fichiersSae.forEach(f => formData.append('fichiers', f));

      await saeService.createSae(formData, token);
      const data = await saeService.getListeSae(token);
      setSaes(data);
      setNomSae(''); setDescriptionSae(''); setVueActuelle('dashboard');
      setSucces("SAE publiée avec succès !");
    } catch (err) { setErreur(err.message); }
  };

  const handleGenerate = async (type) => {
    setErreur(null); setSucces(null);
    try {
      const data = await saeService.generateMockData(type, quantiteGeneration, token);
      setSucces(data.message);
      if (type === 'saes') saeService.getListeSae(token).then(setSaes);
      if (type === 'users') saeService.getAllUsers(token).then(setListeUtilisateurs);
    } catch (err) { setErreur(err.message); }
  };

  const handleImpersonate = async (userId) => {
    try {
      const data = await saeService.impersonateUser(userId, token);
      setToken(data.token); setRole(data.role); setPrenomUser(data.prenom);
      localStorage.setItem('jwtToken', data.token); localStorage.setItem('userRole', data.role); localStorage.setItem('userPrenom', data.prenom);
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleLogout = () => {
    setToken(null); setRole(null); setPrenomUser('');
    localStorage.removeItem('jwtToken'); localStorage.removeItem('userRole'); localStorage.removeItem('userPrenom');
    setSaes([]); setVueActuelle('public');
  };

  // --- UTILS ---
  const saesTriees = [...saes].sort((a, b) => {
    if (!a.date_rendu) return 1;
    if (!b.date_rendu) return -1;
    return triDate === 'asc' 
      ? new Date(a.date_rendu) - new Date(b.date_rendu) 
      : new Date(b.date_rendu) - new Date(a.date_rendu);
  });

  const formatDateTime = (d) => {
    if (!d) return '';
    const obj = new Date(d);
    return isNaN(obj) ? d : obj.toLocaleDateString('fr-FR') + ' à ' + obj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  };

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">🛡️ MMI Hub</div>
        
        <nav className="nav-group">
          <span className="nav-label">Navigation</span>
          <div className={`nav-item ${['dashboard', 'public'].includes(vueActuelle) ? 'active' : ''}`} onClick={() => setVueActuelle(token ? 'dashboard' : 'public')}>
            🏠 Tableau de bord
          </div>
          
          {token && (role === 'enseignant' || role === 'admin') && (
            <div className={`nav-item ${vueActuelle === 'create-sae' ? 'active' : ''}`} onClick={() => setVueActuelle('create-sae')}>
              ➕ Créer une SAE
            </div>
          )}

          {token && role === 'admin' && (
            <div className={`nav-item ${vueActuelle === 'admin' ? 'active' : ''}`} onClick={() => setVueActuelle('admin')}>
              👑 Administration
            </div>
          )}

          {/* TOGGLE MODE SOMBRE */}
          <div className="nav-item theme-toggle" onClick={toggleTheme} style={{marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
            {isDarkMode ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
          </div>
        </nav>

        <div className="sidebar-footer">
          {token ? (
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{prenomUser}</span>
                <span className="user-role">{role}</span>
              </div>
              <button onClick={handleLogout} className="btn-icon-logout" title="Déconnexion">🚪</button>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              <button onClick={() => setVueActuelle('login')} className="btn-download">Connexion</button>
              <button onClick={() => setVueActuelle('register')} className="btn-secondary" style={{width:'100%'}}>S'inscrire</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-layout">
        <header className="header">
          <div className="header-left">
            <h1>{
              vueActuelle === 'admin' ? 'Panneau de contrôle' : 
              vueActuelle === 'create-sae' ? 'Nouvelle SAE' : 
              'Situations d\'Apprentissage'
            }</h1>
            {token && <div className="badge badge-primary">Session 2025-2026</div>}
          </div>
          
          {(vueActuelle === 'dashboard' || vueActuelle === 'public') && (
            <select className="tri-select" value={triDate} onChange={(e) => setTriDate(e.target.value)}>
              <option value="asc">Date : Plus proche</option>
              <option value="desc">Date : Plus lointaine</option>
            </select>
          )}
        </header>

        <div className="content-scroll">
          {erreur && <div className="alert alert-danger">{erreur}</div>}
          {succes && <div className="alert alert-success">{succes}</div>}

          {/* VUE : DASHBOARD / PUBLIC */}
          {(vueActuelle === 'dashboard' || vueActuelle === 'public') && (
            <div className="sae-grid">
              {loading ? <p>Chargement des ressources...</p> : 
               saesTriees.length > 0 ? saesTriees.map(sae => (
                <div key={sae.id} className="card">
                  <div className="card-header">
                    <span className="badge badge-primary">{sae.classe_cible}</span>
                    <span className="badge badge-warning">PDF</span>
                  </div>
                  <h3 className="card-title">{sae.nom}</h3>
                  <p className="card-desc">{sae.description}</p>
                  <div className="card-meta">
                    {sae.date_rendu && <span>📅 À rendre : {formatDateTime(sae.date_rendu)}</span>}
                  </div>
                  {sae.documents && (
                    <div className="file-links">
                      {JSON.parse(sae.documents).map((file, i) => (
                        <a key={i} href={`${SERVER_URL}/uploads/${file}`} target="_blank" rel="noreferrer" className="btn-download">
                          📄 Voir le sujet {i > 0 ? i + 1 : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )) : <p className="text-muted">Aucune SAE disponible pour le moment.</p>}
            </div>
          )}

          {/* VUE : LOGIN */}
          {vueActuelle === 'login' && (
            <div className="form-card-container">
              <div className="card form-card">
                <h2>Connexion</h2>
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label>E-mail ou Identifiant</label>
                    <input 
                      type="text" 
                      placeholder="Identifiant"
                      value={identifiant} 
                      onChange={(e) => setIdentifiant(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-download">Se connecter</button>
                </form>
                <button onClick={() => setVueActuelle('public')} className="btn-secondary" style={{marginTop: '1rem', width: '100%'}}>Retour</button>
              </div>
            </div>
          )}

          {/* VUE : REGISTER */}
          {vueActuelle === 'register' && (
            <div className="form-card-container">
              <div className="card form-card">
                <h2>Créer un compte</h2>
                <form onSubmit={handleRegister}>
                  <div className="form-row">
                    <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                    <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                  <input type="email" placeholder="Adresse Email" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
                  <input type="password" placeholder="Mot de passe (6+ car.)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
                  <div className="form-row">
                    <select value={roleInscription} onChange={(e) => setRoleInscription(e.target.value)}>
                      <option value="etudiant">Étudiant</option>
                      <option value="enseignant">Enseignant</option>
                    </select>
                    {roleInscription === 'etudiant' && (
                      <select value={classeInscription} onChange={(e) => setClasseInscription(e.target.value)}>
                        {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                  <button type="submit" className="btn-download">S'inscrire</button>
                </form>
                <button onClick={() => setVueActuelle('login')} className="btn-secondary" style={{marginTop: '1rem', width: '100%'}}>Déjà inscrit ?</button>
              </div>
            </div>
          )}

          {/* VUE : CREATE SAE */}
          {vueActuelle === 'create-sae' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'600px'}}>
                <h2>Publier un nouveau sujet</h2>
                <form onSubmit={handleCreateSae}>
                  <div className="form-group">
                    <label>Nom de la SAE</label>
                    <input type="text" placeholder="ex: SAE 3.01 - Développement Web" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                      <label>Date de rendu</label>
                      <input type="datetime-local" value={dateRenduSae} onChange={(e) => setDateRenduSae(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{flex:1}}>
                      <label>Classe cible</label>
                      <select value={classeCible} onChange={(e) => setClasseCible(e.target.value)}>
                        <option value="Toutes">Toutes les classes</option>
                        {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description / Consignes</label>
                    <textarea placeholder="Décrivez les objectifs et livrables..." value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Fichiers joints (PDF)</label>
                    <input type="file" multiple onChange={(e) => setFichiersSae(Array.from(e.target.files))} />
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button type="submit" className="btn-download" style={{flex:2}}>Publier la SAE</button>
                    <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-secondary" style={{flex:1}}>Annuler</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VUE : ADMIN */}
          {vueActuelle === 'admin' && (
            <div className="admin-layout">
              <div className="card" style={{marginBottom: '2rem'}}>
                <h2>Générateur de données</h2>
                <p className="text-muted" style={{marginBottom:'1rem'}}>Outil de développement pour remplir la base de données.</p>
                <div className="form-row" style={{alignItems:'center', gap:'20px'}}>
                  <input type="number" min="1" max="50" value={quantiteGeneration} onChange={(e) => setQuantiteGeneration(e.target.value)} style={{width:'100px'}} />
                  <button onClick={() => handleGenerate('users')} className="btn-secondary">👤 Générer Utilisateurs</button>
                  <button onClick={() => handleGenerate('saes')} className="btn-secondary">📚 Générer SAEs</button>
                </div>
              </div>

              <div className="card">
                <h2>Base de données des Comptes</h2>
                <div style={{overflowX: 'auto'}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Classe</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listeUtilisateurs.map(user => (
                        <tr key={user.id}>
                          <td style={{fontWeight:'600'}}>{user.prenom} {user.nom}</td>
                          <td className="text-muted">{user.mail}</td>
                          <td><span className={`badge badge-${user.role === 'admin' ? 'warning' : user.role === 'enseignant' ? 'success' : 'primary'}`}>{user.role}</span></td>
                          <td>{user.classe || '-'}</td>
                          <td>
                            {user.role !== 'admin' && (
                              <button onClick={() => handleImpersonate(user.id)} className="btn-small">🔗 Se connecter</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
