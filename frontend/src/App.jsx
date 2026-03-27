// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService, SERVER_URL } from './services/saeServices';
import './App.css';

// NOUVEAU : La liste de toutes les classes possibles
const CLASSES_DISPOS = ['MMI-A1', 'MMI-A2', 'MMI-B1', 'MMI-B2', 'MMI-C1', 'MMI-C2'];

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [prenomUser, setPrenomUser] = useState(localStorage.getItem('userPrenom') || '');
  const [vueActuelle, setVueActuelle] = useState('public');

  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [roleInscription, setRoleInscription] = useState('etudiant');
  const [classeInscription, setClasseInscription] = useState(CLASSES_DISPOS[0]); // Pour l'étudiant

  const [nomSae, setNomSae] = useState('');
  const [descriptionSae, setDescriptionSae] = useState('');
  const [dateRenduSae, setDateRenduSae] = useState(''); 
  const [classeCible, setClasseCible] = useState('Toutes'); // Pour la SAE
  const [fichiersSae, setFichiersSae] = useState([]); 
  
  const [quantiteGeneration, setQuantiteGeneration] = useState(10);
  const [adminMessage, setAdminMessage] = useState(null);

  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [saes, setSaes] = useState([]);
  const [triDate, setTriDate] = useState('asc'); 

  useEffect(() => {
    if (token) {
      setVueActuelle(prev => (prev === 'public' || prev === 'login' || prev === 'register') ? 'dashboard' : prev);
      saeService.getListeSae(token).then(setSaes).catch(handleLogout);
    } else {
      setVueActuelle(prev => (prev === 'dashboard' || prev === 'create-sae' || prev === 'admin') ? 'public' : prev);
      saeService.getPublicListeSae().then(setSaes).catch(console.error);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await saeService.login(mail, password);
      setToken(data.token); setRole(data.role); setPrenomUser(data.prenom);
      localStorage.setItem('jwtToken', data.token); localStorage.setItem('userRole', data.role); localStorage.setItem('userPrenom', data.prenom);
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErreur(null); setSucces(null);
    try {
      // On envoie la classe dans le package
      await saeService.register({ nom, prenom, mail, password, role: roleInscription, classe: classeInscription });
      const data = await saeService.login(mail, password);
      setToken(data.token); setRole(data.role); setPrenomUser(data.prenom);
      localStorage.setItem('jwtToken', data.token); localStorage.setItem('userRole', data.role); localStorage.setItem('userPrenom', data.prenom);
      setNom(''); setPrenom(''); setPassword('');
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
      formData.append('classe_cible', classeCible); // La classe ciblée
      
      fichiersSae.forEach(fichier => formData.append('fichiers', fichier));

      await saeService.createSae(formData, token);
      const donnees = await saeService.getListeSae(token);
      setSaes(donnees);
      
      setNomSae(''); setDescriptionSae(''); setDateRenduSae(''); setClasseCible('Toutes'); setFichiersSae([]);
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleGenerate = async (type) => {
    setAdminMessage(null); setErreur(null);
    try {
      const data = await saeService.generateMockData(type, quantiteGeneration, token);
      setAdminMessage(data.message);
      if (type === 'saes') {
        const donnees = await saeService.getListeSae(token);
        setSaes(donnees);
      }
    } catch(err) { setErreur(err.message); }
  };

  const handleLogout = () => {
    setToken(null); setRole(null); setPrenomUser('');
    localStorage.clear();
    setSaes([]); setVueActuelle('public'); setMail(''); setPassword('');
  };

  const getSaesTriees = (listeASorter) => {
    return [...listeASorter].sort((a, b) => {
      if (!a.date_rendu) return 1;
      if (!b.date_rendu) return -1;
      const dateA = new Date(a.date_rendu).getTime();
      const dateB = new Date(b.date_rendu).getTime();
      return triDate === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const dateObj = new Date(dateString);
    if (isNaN(dateObj)) return dateString; 
    const dateFR = dateObj.toLocaleDateString('fr-FR');
    const timeFR = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    return `${dateFR} à ${timeFR}`;
  };

  const renderFichiers = (documentsJson) => {
    if (!documentsJson) return null;
    try {
      const fichiers = JSON.parse(documentsJson);
      if (!Array.isArray(fichiers) || fichiers.length === 0) return null;
      return (
        <div style={{ marginTop: '1rem', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>📎 Pièces jointes :</strong>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
            {fichiers.map((fichier, index) => {
               const nomAffiche = fichier.includes('-') ? fichier.split('-').slice(1).join('-') : fichier;
               return (
                 <li key={index} style={{ marginBottom: '5px' }}>
                   <a href={`${SERVER_URL}/uploads/${fichier}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{nomAffiche}</a>
                 </li>
               );
            })}
          </ul>
        </div>
      );
    } catch(e) { return null; }
  };

  // --- VUES PUBLIQUES ET CONNEXION ---
  if (vueActuelle === 'public') {
    const saesAffichees = getSaesTriees(saes); 
    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', margin: 0 }}>MMI Hub</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>La vitrine des travaux MMI</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <select value={triDate} onChange={(e) => setTriDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)' }}>
              <option value="asc">Trier : Rendu le plus proche</option>
              <option value="desc">Trier : Rendu le plus lointain</option>
            </select>
            <button onClick={() => setVueActuelle('login')} className="btn-primary">Connexion</button>
            <button onClick={() => setVueActuelle('register')} className="btn-primary" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Inscription</button>
          </div>
        </div>
        <div className="sae-list">
          {saesAffichees.length === 0 ? <p>Aucune SAE.</p> : saesAffichees.map((sae) => (
             <div key={sae.id} className="sae-card">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <h3>{sae.nom}</h3>
                 <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>{sae.classe_cible}</span>
               </div>
               {sae.date_rendu && <p style={{ color: '#d97706', fontWeight: 'bold', fontSize: '0.9rem' }}>📅 À rendre pour le : {formatDateTime(sae.date_rendu)}</p>}
               <p>{sae.description}</p>
               {renderFichiers(sae.documents)}
             </div>
          ))}
        </div>
      </div>
    );
  }

  if (vueActuelle === 'login') {
    return (
      <div className="login-wrapper">
        <h1>Connexion</h1>
        <form onSubmit={handleLogin}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          <input type="text" placeholder="Adresse e-mail ou Identifiant" value={mail} onChange={(e) => setMail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary">Se connecter</button>
        </form>
        <button onClick={() => setVueActuelle('public')} style={{ background: 'none', color: 'var(--text-muted)', marginTop: '1rem', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>Retour</button>
      </div>
    );
  }

  if (vueActuelle === 'register') {
    return (
      <div className="login-wrapper">
        <h1>Créer un compte</h1>
        <form onSubmit={handleRegister}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required style={{ width: '50%' }}/>
            <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '50%' }}/>
          </div>
          <input type="email" placeholder="Adresse e-mail" value={mail} onChange={(e) => setMail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={roleInscription} onChange={(e) => setRoleInscription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1 }}>
              <option value="etudiant">Étudiant</option>
              <option value="enseignant">Enseignant</option>
            </select>
            
            {/* On affiche le choix de la classe seulement pour les étudiants */}
            {roleInscription === 'etudiant' && (
              <select value={classeInscription} onChange={(e) => setClasseInscription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1 }}>
                {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>S'inscrire</button>
        </form>
        <button onClick={() => setVueActuelle('login')} style={{ background: 'none', color: 'var(--text-muted)', marginTop: '1rem', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>Déjà inscrit ? Connexion</button>
      </div>
    );
  }

  // --- VUES PROTÉGÉES ---
  if (vueActuelle === 'create-sae') {
    return (
      <div className="login-wrapper" style={{ maxWidth: '600px' }}>
        <h1>Créer une nouvelle SAE</h1>
        <form onSubmit={handleCreateSae}>
          <input type="text" placeholder="Nom de la SAE (ex: SAE 3.01)" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date de rendu :</label>
              <input type="datetime-local" value={dateRenduSae} onChange={(e) => setDateRenduSae(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit' }}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Classe ciblée :</label>
              <select value={classeCible} onChange={(e) => setClasseCible(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit' }}>
                <option value="Toutes">Toutes les classes</option>
                {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <textarea placeholder="Description" value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem', minHeight: '100px' }} />
          <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px dashed var(--primary)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>Joindre des fichiers :</label>
            <input type="file" multiple onChange={(e) => setFichiersSae(Array.from(e.target.files))} />
            {fichiersSae.length > 0 && <ul>{fichiersSae.map((f, i) => <li key={i}>📄 {f.name}</li>)}</ul>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Publier la SAE</button>
            <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-primary" style={{ background: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Annuler</button>
          </div>
        </form>
      </div>
    );
  }

  if (vueActuelle === 'admin') {
    return (
      <div className="dashboard-container">
         <div className="header-dashboard">
          <h1 style={{ color: '#8b5cf6' }}>👑 Panneau d'Administration</h1>
          <button onClick={() => setVueActuelle('dashboard')} className="btn-primary" style={{ background: 'white', color: '#8b5cf6', border: '1px solid #8b5cf6' }}>Retour au Tableau de Bord</button>
        </div>
        <div style={{ backgroundColor: '#f5f3ff', padding: '2rem', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
          <h2>Générateur de fausses données</h2>
          {erreur && <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '5px', marginBottom: '1rem' }}>{erreur}</div>}
          {adminMessage && <div style={{ padding: '10px', backgroundColor: '#dcfce3', color: '#166534', borderRadius: '5px', marginBottom: '1rem' }}>{adminMessage}</div>}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Quantité à générer : </label>
            <input type="number" min="1" max="50" value={quantiteGeneration} onChange={(e) => setQuantiteGeneration(e.target.value)} style={{ padding: '5px', width: '80px', borderRadius: '5px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => handleGenerate('users')} className="btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>👤 Générer des Comptes</button>
            <button onClick={() => handleGenerate('saes')} className="btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>📚 Générer des SAEs</button>
          </div>
        </div>
      </div>
    );
  }

  // TABLEAU DE BORD STANDARD
  const saesAfficheesDash = getSaesTriees(saes); 
  
  return (
    <div className="dashboard-container">
      <div className="header-dashboard">
        <h1>Suivi des SAE</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold' }}>Bonjour, {prenomUser}</span>
          <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>Vue {role === 'admin' ? 'Système' : role === 'enseignant' ? 'Enseignant' : 'Étudiant'}</h2>
          <select value={triDate} onChange={(e) => setTriDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)' }}>
              <option value="asc">Trier : Plus proche</option>
              <option value="desc">Trier : Plus lointain</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {role === 'admin' && <button onClick={() => setVueActuelle('admin')} className="btn-primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6', margin: 0 }}>👑 Gérer le site</button>}
          {(role === 'enseignant' || role === 'admin') && <button onClick={() => setVueActuelle('create-sae')} className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', margin: 0 }}>➕ Créer une nouvelle SAE</button>}
        </div>
      </div>

      <div className="sae-list">
        {saesAfficheesDash.length === 0 ? <p>Aucune SAE dans la base de données.</p> : saesAfficheesDash.map((sae) => (
            <div key={sae.id} className="sae-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <h3>{sae.nom}</h3>
                 <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>{sae.classe_cible}</span>
              </div>
              {sae.date_rendu && <p style={{ color: '#d97706', fontWeight: 'bold', fontSize: '0.9rem' }}>📅 À rendre pour le : {formatDateTime(sae.date_rendu)}</p>}
              <p><strong>Description :</strong> {sae.description}</p>
              {renderFichiers(sae.documents)}
            </div>
        ))}
      </div>
    </div>
  );
}

export default App;