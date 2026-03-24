// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService, SERVER_URL } from './services/saeServices';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [prenomUser, setPrenomUser] = useState(localStorage.getItem('userPrenom') || '');
  const [vueActuelle, setVueActuelle] = useState('public');

  // États des formulaires (Connexion/Inscription)
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [roleInscription, setRoleInscription] = useState('etudiant');

  // États du formulaire de création de SAE
  const [nomSae, setNomSae] = useState('');
  const [descriptionSae, setDescriptionSae] = useState('');
  const [fichiersSae, setFichiersSae] = useState([]); // Tableau de fichiers
  
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [saes, setSaes] = useState([]);
  const [anneeFiltre, setAnneeFiltre] = useState(''); 

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
      const data = await saeService.login(mail, password);
      setToken(data.token);
      setRole(data.role);
      setPrenomUser(data.prenom);
      
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userPrenom', data.prenom);
    } catch (err) {
      setErreur(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    
    try {
      await saeService.register({ nom, prenom, mail, password, role: roleInscription });
      const data = await saeService.login(mail, password);
      
      setToken(data.token);
      setRole(data.role);
      setPrenomUser(data.prenom);
      
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userPrenom', data.prenom);

      setNom(''); setPrenom(''); setPassword('');
    } catch (err) {
      setErreur(err.message);
    }
  };

  const handleCreateSae = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      // Création du paquet de données
      const formData = new FormData();
      formData.append('nom', nomSae);
      formData.append('description', descriptionSae);
      
      // Ajout des fichiers au paquet
      fichiersSae.forEach(fichier => {
        formData.append('fichiers', fichier);
      });

      await saeService.createSae(formData, token);
      
      const donnees = await saeService.getListeSae(token);
      setSaes(donnees);
      
      setNomSae(''); setDescriptionSae(''); setFichiersSae([]);
      setVueActuelle('dashboard');
    } catch (err) {
      setErreur(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    setPrenomUser('');
    localStorage.clear();
    setSaes([]);
    setVueActuelle('public');
    setMail('');
    setPassword('');
  };

  // Fonction pour afficher proprement les liens des fichiers joints
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
               // Enlève le timestamp du nom pour faire plus propre
               const nomAffiche = fichier.includes('-') ? fichier.split('-').slice(1).join('-') : fichier;
               return (
                 <li key={index} style={{ marginBottom: '5px' }}>
                   <a href={`${SERVER_URL}/uploads/${fichier}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                     {nomAffiche}
                   </a>
                 </li>
               );
            })}
          </ul>
        </div>
      );
    } catch(e) {
      return null;
    }
  };

  // ==========================================
  // VUE 1 : PUBLIC (Galerie)
  // ==========================================
  if (vueActuelle === 'public') {
    const saesPubliquesFiltrees = anneeFiltre ? saes.filter(sae => sae.annee && sae.annee.toString() === anneeFiltre) : saes;
    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', margin: 0 }}>MMI Hub</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>La vitrine des travaux MMI</p>
          </div>
          <div>
            <button onClick={() => setVueActuelle('login')} className="btn-primary" style={{ marginRight: '10px' }}>Connexion</button>
            <button onClick={() => setVueActuelle('register')} className="btn-primary" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Inscription</button>
          </div>
        </div>
        <div className="sae-list">
          {saesPubliquesFiltrees.length === 0 ? <p>Aucune SAE (ou base de données vide).</p> : saesPubliquesFiltrees.map((sae) => (
             <div key={sae.id} className="sae-card">
               <h3>{sae.nom}</h3>
               <p>{sae.description}</p>
               {renderFichiers(sae.documents)}
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
        {succes && <p style={{ color: 'green', fontWeight: 'bold' }}>{succes}</p>}
        <form onSubmit={handleLogin}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          <input type="email" placeholder="Adresse e-mail" value={mail} onChange={(e) => setMail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary">Se connecter</button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Pas encore de compte ? <button onClick={() => setVueActuelle('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>S'inscrire</button>
        </p>
        <button onClick={() => setVueActuelle('public')} style={{ background: 'none', color: 'var(--text-muted)', marginTop: '1rem', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>Retour à la vue Public</button>
      </div>
    );
  }

  // ==========================================
  // VUE 3 : INSCRIPTION
  // ==========================================
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
          
          <select value={roleInscription} onChange={(e) => setRoleInscription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <option value="etudiant">Je suis Étudiant</option>
            <option value="enseignant">Je suis Enseignant</option>
          </select>

          <button type="submit" className="btn-primary">Valider l'inscription</button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Déjà un compte ? <button onClick={() => setVueActuelle('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Se connecter</button>
        </p>
      </div>
    );
  }

  // ==========================================
  // VUE 4 : CRÉATION DE SAE
  // ==========================================
  if (vueActuelle === 'create-sae') {
    return (
      <div className="login-wrapper" style={{ maxWidth: '600px' }}>
        <h1>Créer une nouvelle SAE</h1>
        <form onSubmit={handleCreateSae}>
          {erreur && <p style={{ color: 'var(--danger)' }}>{erreur}</p>}
          <input type="text" placeholder="Nom de la SAE (ex: SAE 3.01)" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required />
          <textarea placeholder="Description détaillée de la SAE" value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem', minHeight: '100px', fontFamily: 'inherit' }} />
          
          <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px dashed var(--primary)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>Joindre des fichiers (PDF, Word, etc.) :</label>
            <input 
              type="file" 
              multiple 
              onChange={(e) => setFichiersSae(Array.from(e.target.files))} 
            />
            {fichiersSae.length > 0 && (
              <ul style={{ marginTop: '10px', fontSize: '0.9rem', color: '#475569', paddingLeft: '20px' }}>
                {fichiersSae.map((f, index) => <li key={index}>📄 {f.name}</li>)}
              </ul>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Publier la SAE</button>
            <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-primary" style={{ background: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Annuler</button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VUE 5 : TABLEAU DE BORD (Protégé)
  // ==========================================
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
        <h2>Vue {role === 'enseignant' ? 'Enseignant' : 'Étudiant'}</h2>
        
        {role === 'enseignant' && (
          <button 
            onClick={() => setVueActuelle('create-sae')} 
            className="btn-primary" 
            style={{ background: '#10b981', borderColor: '#10b981', margin: 0 }}
          >
            ➕ Créer une nouvelle SAE
          </button>
        )}
      </div>

      <div className="sae-list">
        {saes.length === 0 ? (
          <p>Aucune SAE dans la base de données.</p>
        ) : (
          saes.map((sae) => (
            <div key={sae.id} className="sae-card">
              <h3>{sae.nom}</h3>
              <p><strong>Description :</strong> {sae.description}</p>
              {renderFichiers(sae.documents)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;