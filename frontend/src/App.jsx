// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { saeService, SERVER_URL } from './services/saeServices';
import './App.css';

const CLASSES_DISPOS = ['MMI-A1', 'MMI-A2', 'MMI-B1', 'MMI-B2', 'MMI-C1', 'MMI-C2'];

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const [prenomUser, setPrenomUser] = useState(localStorage.getItem('userPrenom') || '');
  const [userClasse, setUserClasse] = useState(localStorage.getItem('userClasse') || ''); 
  const [vueActuelle, setVueActuelle] = useState('public');

  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [roleInscription, setRoleInscription] = useState('etudiant');
  
  const [classeInscription, setClasseInscription] = useState(CLASSES_DISPOS[0]); 
  const [classesEnseignant, setClassesEnseignant] = useState([]); 

  // États pour la page Profil
  const [profilData, setProfilData] = useState({ nom: '', prenom: '', mail: '', classeEtudiant: '', classesEns: [] });
  const [profilMessage, setProfilMessage] = useState(null);

  const [nomSae, setNomSae] = useState('');
  const [descriptionSae, setDescriptionSae] = useState('');
  const [dateRenduSae, setDateRenduSae] = useState(''); 
  const [classeCible, setClasseCible] = useState('Toutes'); 
  const [fichiersSae, setFichiersSae] = useState([]); 
  
  const [quantiteGeneration, setQuantiteGeneration] = useState(10);
  const [adminMessage, setAdminMessage] = useState(null);
  const [listeUtilisateurs, setListeUtilisateurs] = useState([]); 

  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [saes, setSaes] = useState([]);
  const [triDate, setTriDate] = useState('asc'); 

  useEffect(() => {
    if (token) {
      if (vueActuelle === 'public' || vueActuelle === 'login' || vueActuelle === 'register') {
        setVueActuelle('dashboard');
      }
      saeService.getListeSae(token).then(setSaes).catch(handleLogout);
      
      if (vueActuelle === 'admin' && role === 'admin') {
         saeService.getAllUsers(token).then(setListeUtilisateurs).catch(e => console.error(e));
      }
    } else {
      setVueActuelle(prev => (prev === 'dashboard' || prev === 'create-sae' || prev === 'admin' || prev === 'profile') ? 'public' : prev);
      saeService.getPublicListeSae().then(setSaes).catch(console.error);
    }
  }, [token, vueActuelle, role]);

  const saveAuthData = (data) => {
    setToken(data.token); setRole(data.role); setPrenomUser(data.prenom); setUserClasse(data.classe);
    localStorage.setItem('jwtToken', data.token); 
    localStorage.setItem('userRole', data.role); 
    localStorage.setItem('userPrenom', data.prenom);
    localStorage.setItem('userClasse', data.classe); 
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur(null);
    try {
      const data = await saeService.login(mail, password);
      saveAuthData(data);
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErreur(null); setSucces(null);
    const classeFormattee = roleInscription === 'enseignant' ? JSON.stringify(classesEnseignant) : classeInscription;

    if (roleInscription === 'enseignant' && classesEnseignant.length === 0) {
        setErreur("Veuillez sélectionner au moins une classe.");
        return;
    }

    try {
      await saeService.register({ nom, prenom, mail, password, role: roleInscription, classe: classeFormattee });
      const data = await saeService.login(mail, password);
      saveAuthData(data);
      setNom(''); setPrenom(''); setPassword('');
      setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  // NOUVEAU : Fonction pour ouvrir la page profil et pré-remplir les données
  const openProfilePage = async () => {
      setErreur(null); setProfilMessage(null);
      try {
          const data = await saeService.getMyProfile(token);
          let classesEns = [];
          let classeEtu = CLASSES_DISPOS[0];
          
          if (data.role === 'enseignant' || data.role === 'admin') {
              try { classesEns = JSON.parse(data.classe); } catch(e) {}
          } else {
              classeEtu = data.classe;
          }
          
          setProfilData({ nom: data.nom, prenom: data.prenom, mail: data.mail, classeEtudiant: classeEtu, classesEns: classesEns });
          setVueActuelle('profile');
      } catch(err) { setErreur(err.message); }
  };

  // NOUVEAU : Sauvegarder les modifications du profil
  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setErreur(null); setProfilMessage(null);

      const classeFormattee = (role === 'enseignant' || role === 'admin') ? JSON.stringify(profilData.classesEns) : profilData.classeEtudiant;
      
      if ((role === 'enseignant' || role === 'admin') && profilData.classesEns.length === 0) {
          setErreur("Vous devez avoir au moins une classe.");
          return;
      }

      try {
          const data = await saeService.updateProfile({ nom: profilData.nom, prenom: profilData.prenom, mail: profilData.mail, classe: classeFormattee }, token);
          saveAuthData(data); // Met à jour le Token dans React et le LocalStorage
          setProfilMessage(data.message);
      } catch(err) { setErreur(err.message); }
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
      } else if (type === 'users') {
        const users = await saeService.getAllUsers(token);
        setListeUtilisateurs(users);
      }
    } catch(err) { setErreur(err.message); }
  };

  const handleImpersonate = async (userId) => {
    try {
      const data = await saeService.impersonateUser(userId, token);
      saveAuthData(data);
      setVueActuelle('dashboard');
    } catch(err) { setErreur(err.message); }
  };

  const handleLogout = () => {
    setToken(null); setRole(null); setPrenomUser(''); setUserClasse('');
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

  const renderClasseFormattee = (classeTexte) => {
      if (!classeTexte) return "N/A";
      if (classeTexte.startsWith('[')) {
          try { return JSON.parse(classeTexte).join(', '); } catch(e) { return classeTexte; }
      }
      return classeTexte;
  };

  // --- VUES ---
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
            {roleInscription === 'etudiant' && (
              <select value={classeInscription} onChange={(e) => setClasseInscription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1 }}>
                {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {roleInscription === 'enseignant' && (
             <div style={{ marginTop: '10px', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text)' }}>Cochez vos classes :</label>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 {CLASSES_DISPOS.map(c => (
                   <label key={c} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input 
                       type="checkbox" 
                       checked={classesEnseignant.includes(c)} 
                       onChange={(e) => {
                         if (e.target.checked) setClassesEnseignant([...classesEnseignant, c]);
                         else setClassesEnseignant(classesEnseignant.filter(cls => cls !== c));
                       }} 
                     />
                     {c}
                   </label>
                 ))}
               </div>
             </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>S'inscrire</button>
        </form>
        <button onClick={() => setVueActuelle('login')} style={{ background: 'none', color: 'var(--text-muted)', marginTop: '1rem', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>Déjà inscrit ? Connexion</button>
      </div>
    );
  }

  // --- VUE PROFIL (MON COMPTE) ---
  if (vueActuelle === 'profile') {
    return (
      <div className="login-wrapper" style={{ maxWidth: '600px' }}>
        <h1 style={{ color: 'var(--primary)' }}>👤 Mon Compte</h1>
        {profilMessage && <div style={{ padding: '10px', backgroundColor: '#dcfce3', color: '#166534', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{profilMessage}</div>}
        
        <form onSubmit={handleUpdateProfile}>
          {erreur && <p style={{ color: 'var(--danger)', fontWeight: '500' }}>{erreur}</p>}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
               <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Prénom :</label>
               <input type="text" value={profilData.prenom} onChange={(e) => setProfilData({...profilData, prenom: e.target.value})} required style={{ marginTop: '5px' }}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
               <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Nom :</label>
               <input type="text" value={profilData.nom} onChange={(e) => setProfilData({...profilData, nom: e.target.value})} required style={{ marginTop: '5px' }}/>
            </div>
          </div>
          
          <div style={{ textAlign: 'left', marginTop: '10px' }}>
             <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Adresse e-mail :</label>
             <input type="email" value={profilData.mail} onChange={(e) => setProfilData({...profilData, mail: e.target.value})} required style={{ marginTop: '5px' }} />
          </div>

          <div style={{ marginTop: '15px', textAlign: 'left', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>Ma classe / Mes classes :</label>
            
            {role === 'etudiant' ? (
                <select value={profilData.classeEtudiant} onChange={(e) => setProfilData({...profilData, classeEtudiant: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {CLASSES_DISPOS.map(c => (
                    <label key={c} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={profilData.classesEns.includes(c)} 
                        onChange={(e) => {
                          if (e.target.checked) setProfilData({...profilData, classesEns: [...profilData.classesEns, c]});
                          else setProfilData({...profilData, classesEns: profilData.classesEns.filter(cls => cls !== c)});
                        }} 
                      />
                      {c}
                    </label>
                  ))}
                </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Enregistrer les modifications</button>
            <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-primary" style={{ background: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Retour</button>
          </div>
        </form>
      </div>
    );
  }

  if (vueActuelle === 'create-sae') {
    let classesDuProf = CLASSES_DISPOS;
    if (userClasse && userClasse.startsWith('[')) {
        try { classesDuProf = JSON.parse(userClasse); } catch(e) {}
    }

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
                <option value="Toutes">Toutes mes classes</option>
                {classesDuProf.map(c => <option key={c} value={c}>{c}</option>)}
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
          <h1 style={{ color: '#8b5cf6', margin: 0 }}>👑 Panneau d'Administration</h1>
          <button onClick={() => setVueActuelle('dashboard')} className="btn-primary" style={{ background: 'white', color: '#8b5cf6', border: '1px solid #8b5cf6', margin: 0 }}>Retour au Dashboard</button>
        </div>
        
        <div style={{ backgroundColor: '#f5f3ff', padding: '2rem', borderRadius: '10px', border: '1px solid #ddd6fe', marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>Générateur de données (Mock Data)</h2>
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

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <h2 style={{ marginTop: 0, color: '#1e293b' }}>Base de données des Comptes</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px' }}>Nom</th>
                <th style={{ padding: '10px' }}>Email</th>
                <th style={{ padding: '10px' }}>Rôle</th>
                <th style={{ padding: '10px' }}>Classe(s)</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {listeUtilisateurs.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{user.prenom} {user.nom}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{user.mail}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: user.role === 'admin' ? '#f3e8ff' : user.role === 'enseignant' ? '#dcfce3' : '#e0f2fe', color: user.role === 'admin' ? '#7e22ce' : user.role === 'enseignant' ? '#166534' : '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.9rem' }}>{renderClasseFormattee(user.classe)}</td>
                  <td style={{ padding: '10px' }}>
                    {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleImpersonate(user.id)} 
                          style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                            🔗 Se connecter
                        </button>
                    )}
                  </td>
                </tr>
              ))}
              {listeUtilisateurs.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Chargement des utilisateurs...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- TABLEAU DE BORD STANDARD ---
  const saesAfficheesDash = getSaesTriees(saes); 
  
  return (
    <div className="dashboard-container">
      <div className="header-dashboard">
        <h1>Suivi des SAE</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold' }}>Bonjour, {prenomUser}</span>
          {/* NOUVEAU : LE BOUTON MON COMPTE */}
          <button onClick={openProfilePage} className="btn-primary" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 15px', margin: 0 }}>👤 Mon Compte</button>
          <button onClick={handleLogout} className="btn-logout" style={{ margin: 0 }}>Déconnexion</button>
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