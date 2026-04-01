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
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  const [identifiant, setIdentifiant] = useState(''); 
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  
  const [classeInscription, setClasseInscription] = useState(CLASSES_DISPOS[0]);

  const [profilData, setProfilData] = useState({ nom: '', prenom: '', mail: '', classeEtudiant: '', classesEns: [] });
  const [profilMessage, setProfilMessage] = useState(null);

  const [nomSae, setNomSae] = useState('');
  const [descriptionSae, setDescriptionSae] = useState('');
  const [dateRenduSae, setDateRenduSae] = useState(''); 
  const [classeCible, setClasseCible] = useState('Toutes'); 
  const [fichiersSae, setFichiersSae] = useState([]); 
  
  const [selectedSae, setSelectedSae] = useState(null);
  const [selectedRendu, setSelectedRendu] = useState(null);
  const [fichiersRendu, setFichiersRendu] = useState([]);

  const [annonces, setAnnonces] = useState([]);
  const [messageAnnonce, setMessageAnnonce] = useState('');
  const [classeCibleAnnonce, setClasseCibleAnnonce] = useState('Toutes');
  const [saeLieeAnnonce, setSaeLieeAnnonce] = useState('');
  
  const [etudiants, setEtudiants] = useState([]);
  const [classeGeree, setClasseGeree] = useState('');

  // FORMULAIRE ADMIN MANUEL
  const [adminNewNom, setAdminNewNom] = useState('');
  const [adminNewPrenom, setAdminNewPrenom] = useState('');
  const [adminNewMail, setAdminNewMail] = useState('');
  const [adminNewPwd, setAdminNewPwd] = useState('');
  const [adminNewRole, setAdminNewRole] = useState('enseignant');
  const [adminNewClasses, setAdminNewClasses] = useState([]);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [adminEditUserId, setAdminEditUserId] = useState(null);

  const [quantiteGeneration, setQuantiteGeneration] = useState(10);
  const [adminMessage, setAdminMessage] = useState(null);
  const [listeUtilisateurs, setListeUtilisateurs] = useState([]); 

  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [saes, setSaes] = useState([]);
  const [triDate, setTriDate] = useState('asc'); 
  const [filtresStatut, setFiltresStatut] = useState(['En cours', 'En retard', 'Terminée']);

  useEffect(() => {
    if (isDarkMode) { document.body.classList.add('dark-mode'); localStorage.setItem('theme', 'dark'); } 
    else { document.body.classList.remove('dark-mode'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);
  
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    setLoading(true); setErreur(null);
    if (token) {
      if (['public', 'login', 'register'].includes(vueActuelle)) setVueActuelle('dashboard');
      saeService.getListeSae(token).then(setSaes).catch(handleLogout).finally(() => setLoading(false));
      saeService.getAnnonces(token).then(setAnnonces).catch(console.error);

      if (vueActuelle === 'admin' && role === 'admin') saeService.getAllUsers(token).then(setListeUtilisateurs).catch(console.error);
      if (vueActuelle === 'gestion-classe' && role === 'enseignant') saeService.getEtudiants(token).then(setEtudiants).catch(console.error);
    
    } else {
      setVueActuelle(prev => ['dashboard', 'create-sae', 'admin', 'profile', 'sae-details', 'edit-sae', 'gestion-classe', 'create-annonce'].includes(prev) ? 'public' : prev);
      saeService.getPublicListeSae().then(setSaes).catch(console.error).finally(() => setLoading(false));
    }
  }, [token, vueActuelle, role, classeGeree]);

  const saveAuthData = (data) => {
    setToken(data.token); setRole(data.role); setPrenomUser(data.prenom); setUserClasse(data.classe);
    localStorage.setItem('jwtToken', data.token); localStorage.setItem('userRole', data.role); localStorage.setItem('userPrenom', data.prenom); localStorage.setItem('userClasse', data.classe); 
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setErreur(null);
    try {
      const data = await saeService.login(identifiant, password);
      saveAuthData(data); setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setErreur(null); setSucces(null);
    try {
      await saeService.register({ nom, prenom, mail: identifiant, password, classe: classeInscription });
      const data = await saeService.login(identifiant, password);
      saveAuthData(data); setNom(''); setPrenom(''); setPassword(''); setVueActuelle('dashboard');
    } catch (err) { setErreur(err.message); }
  };

  const openProfilePage = async () => {
      setErreur(null); setProfilMessage(null);
      try {
          const data = await saeService.getMyProfile(token);
          let classesEns = []; let classeEtu = CLASSES_DISPOS[0];
          if (data.role === 'enseignant' || data.role === 'admin') { try { classesEns = JSON.parse(data.classe); } catch(e) {} } 
          else { classeEtu = data.classe; }
          setProfilData({ nom: data.nom, prenom: data.prenom, mail: data.mail, classeEtudiant: classeEtu, classesEns: classesEns });
          setVueActuelle('profile');
      } catch(err) { setErreur(err.message); }
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault(); setErreur(null); setProfilMessage(null);
      const classeFormattee = (role === 'enseignant' || role === 'admin') ? JSON.stringify(profilData.classesEns) : profilData.classeEtudiant;
      if ((role === 'enseignant' || role === 'admin') && profilData.classesEns.length === 0) return setErreur("Sélectionnez au moins une classe.");
      try {
          const data = await saeService.updateProfile({ nom: profilData.nom, prenom: profilData.prenom, mail: profilData.mail, classe: classeFormattee }, token);
          saveAuthData(data); setProfilMessage(data.message);
      } catch(err) { setErreur(err.message); }
  };

  const handleCreateAnnonce = async (e) => {
    e.preventDefault(); setErreur(null);
    try {
      await saeService.createAnnonce({ message: messageAnnonce, classe_cible: classeCibleAnnonce, sae_id: saeLieeAnnonce || null }, token);
      const data = await saeService.getAnnonces(token);
      setAnnonces(data);
      setMessageAnnonce(''); setSaeLieeAnnonce(''); setVueActuelle('dashboard'); setSucces("Annonce envoyée !");
    } catch (err) { setErreur(err.message); }
  };

  const openEditSae = (sae) => {
    setNomSae(sae.nom); setDescriptionSae(sae.description); setDateRenduSae(sae.date_rendu || ''); setClasseCible(sae.classe_cible || 'Toutes');
    setSelectedSae(sae); setFichiersSae([]); setErreur(null); setVueActuelle('edit-sae');
  };

  const handleEditSae = async (e) => {
    e.preventDefault(); setErreur(null);
    try {
      const formData = new FormData();
      formData.append('nom', nomSae); formData.append('description', descriptionSae); formData.append('date_rendu', dateRenduSae); formData.append('classe_cible', classeCible);
      fichiersSae.forEach(f => formData.append('fichiers', f));
      await saeService.updateSae(selectedSae.id, formData, token);
      const data = await saeService.getListeSae(token);
      setSaes(data); setNomSae(''); setDescriptionSae(''); setVueActuelle('dashboard'); setSucces("SAE modifiée avec succès !");
    } catch (err) { setErreur(err.message); }
  };

  const openSaeDetails = async (saeId) => {
    setErreur(null); setSucces(null);
    try {
      const data = await saeService.getSaeDetails(saeId, token);
      setSelectedSae(data.sae); setSelectedRendu(data.rendu); setVueActuelle('sae-details');
    } catch(err) { setErreur(err.message); }
  };

  const handleCreateSae = async (e) => {
    e.preventDefault(); setErreur(null);
    try {
      const formData = new FormData();
      formData.append('nom', nomSae); formData.append('description', descriptionSae); formData.append('date_rendu', dateRenduSae); formData.append('classe_cible', classeCible);
      fichiersSae.forEach(f => formData.append('fichiers', f));

      await saeService.createSae(formData, token);
      const data = await saeService.getListeSae(token);
      setSaes(data);
      setNomSae(''); setDescriptionSae(''); setDateRenduSae(''); setClasseCible('Toutes'); setFichiersSae([]); setVueActuelle('dashboard');
      setSucces("SAE publiée avec succès !");
    } catch (err) { setErreur(err.message); }
  };

  const handleSubmitRendu = async (e) => {
    e.preventDefault(); setErreur(null); setSucces(null);
    if (fichiersRendu.length === 0) return setErreur("Joignez au moins un fichier.");
    try {
      const formData = new FormData();
      fichiersRendu.forEach(f => formData.append('fichiers', f));
      await saeService.soumettreRendu(selectedSae.id, formData, token);
      setSucces("Travail rendu avec succès !"); setFichiersRendu([]);
      const data = await saeService.getSaeDetails(selectedSae.id, token);
      setSelectedRendu(data.rendu);
      const newList = await saeService.getListeSae(token);
      setSaes(newList);
    } catch(err) { setErreur(err.message); }
  };

  const handleAssignerClasse = async (etudiantId, nouvelleClasse) => {
      setErreur(null); setSucces(null);
      try {
          await saeService.updateEtudiantClasse(etudiantId, nouvelleClasse, token);
          setSucces("L'élève a bien été assigné à la classe !");
          const data = await saeService.getEtudiants(token);
          setEtudiants(data);
      } catch(err) { setErreur(err.message); }
  };

  const handleAdminSaveUser = async (e) => {
    e.preventDefault(); setErreur(null); setAdminMessage(null);
    if (adminNewRole === 'enseignant' && adminNewClasses.length === 0) return setErreur("Sélectionnez au moins une classe.");
    try {
       const payload = { nom: adminNewNom, prenom: adminNewPrenom, mail: adminNewMail, password: adminNewPwd, role: adminNewRole, classes: adminNewRole === 'enseignant' ? adminNewClasses : adminNewClasses[0] || CLASSES_DISPOS[0] };
       
       if (isEditingUser) {
           await saeService.adminUpdateUser(adminEditUserId, payload, token);
           setAdminMessage("Compte modifié !");
       } else {
           await saeService.adminCreateUser(payload, token);
           setAdminMessage("Compte créé !");
       }
       setIsEditingUser(false); setAdminEditUserId(null);
       setAdminNewNom(''); setAdminNewPrenom(''); setAdminNewMail(''); setAdminNewPwd(''); setAdminNewClasses([]);
       const users = await saeService.getAllUsers(token);
       setListeUtilisateurs(users);
    } catch(err) { setErreur(err.message); }
  };

  const openAdminEditUser = (user) => {
      setIsEditingUser(true); setAdminEditUserId(user.id);
      setAdminNewNom(user.nom); setAdminNewPrenom(user.prenom); setAdminNewMail(user.mail); setAdminNewPwd(''); setAdminNewRole(user.role);
      let parsed = [];
      if(user.role === 'enseignant') { try { parsed = JSON.parse(user.classe); } catch(e){} } else { parsed = [user.classe]; }
      setAdminNewClasses(parsed);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleValidateSae = async (saeId, e) => {
      e.stopPropagation(); 
      try {
          await saeService.validateSae(saeId, token);
          const data = await saeService.getListeSae(token);
          setSaes(data);
      } catch(err) { setErreur(err.message); }
  };

  const handleGenerate = async (type) => {
    setAdminMessage(null); setErreur(null);
    try {
      const data = await saeService.generateMockData(type, quantiteGeneration, token);
      setAdminMessage(data.message);
      if (type === 'saes') saeService.getListeSae(token).then(setSaes);
      else if (type === 'users') saeService.getAllUsers(token).then(setListeUtilisateurs);
    } catch(err) { setErreur(err.message); }
  };

  const handleImpersonate = async (userId) => {
    try {
      const data = await saeService.impersonateUser(userId, token);
      saveAuthData(data); setVueActuelle('dashboard');
    } catch(err) { setErreur(err.message); }
  };

  const handleLogout = () => {
    setToken(null); setRole(null); setPrenomUser(''); setUserClasse('');
    localStorage.clear(); setSaes([]); setVueActuelle('public'); setIdentifiant(''); setPassword('');
  };

  const toggleFiltreStatut = (statut) => {
    setFiltresStatut(prev => prev.includes(statut) ? prev.filter(s => s !== statut) : [...prev, statut]);
  };

  const determinerStatut = (sae) => {
    if (sae.rendu_id || (selectedRendu && selectedSae?.id === sae.id)) return { texte: 'Terminée', couleur: 'success' };
    if (!sae.date_rendu) return { texte: 'En cours', couleur: 'primary' };
    const isRetard = new Date(sae.date_rendu) < new Date();
    if (isRetard) return { texte: 'En retard', couleur: 'danger' };
    return { texte: 'En cours', couleur: 'primary' };
  };

  const getSaesTriees = (listeASorter) => {
    return [...listeASorter].filter(sae => {
       if (role !== 'etudiant') return true;
       return filtresStatut.includes(determinerStatut(sae).texte);
    }).sort((a, b) => {
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

  let classesDuProf = [];
  if (role === 'enseignant' && userClasse && userClasse.startsWith('[')) {
      try { classesDuProf = JSON.parse(userClasse); } catch(e) {}
  }

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

          {token && (role === 'enseignant' || role === 'admin') && (
             <div className={`nav-item ${vueActuelle === 'create-annonce' ? 'active' : ''}`} onClick={() => setVueActuelle('create-annonce')}>
                📢 Nouvelle Annonce
             </div>
          )}

          {token && role === 'enseignant' && classesDuProf.length > 0 && (
             <>
               <span className="nav-label" style={{marginTop: '20px'}}>Mes Classes</span>
               {classesDuProf.map(c => (
                  <div key={c} 
                       className={`nav-item ${vueActuelle === 'gestion-classe' && classeGeree === c ? 'active' : ''}`} 
                       onClick={() => { setClasseGeree(c); setVueActuelle('gestion-classe'); }}>
                     🎓 Classe {c}
                  </div>
               ))}
             </>
          )}

          {token && role === 'admin' && (
            <div className={`nav-item ${vueActuelle === 'admin' ? 'active' : ''}`} onClick={() => setVueActuelle('admin')}>
              👑 Administration
            </div>
          )}

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
              vueActuelle === 'sae-details' ? 'Détails de la SAE' :
              vueActuelle === 'edit-sae' ? 'Modification SAE' :
              vueActuelle === 'profile' ? 'Mon Compte' :
              vueActuelle === 'gestion-classe' ? `Gestion classe ${classeGeree}` :
              vueActuelle === 'create-annonce' ? 'Envoyer une annonce' :
              'Situations d\'Apprentissage'
            }</h1>
            {token && <div className="badge badge-primary">Session 2025-2026</div>}
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            {role === 'etudiant' && vueActuelle === 'dashboard' && (
              <div style={{ display: 'flex', gap: '15px', backgroundColor: 'var(--bg-color)', padding: '8px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Afficher :</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={filtresStatut.includes('En cours')} onChange={() => toggleFiltreStatut('En cours')} /> En cours
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={filtresStatut.includes('En retard')} onChange={() => toggleFiltreStatut('En retard')} /> En retard
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={filtresStatut.includes('Terminée')} onChange={() => toggleFiltreStatut('Terminée')} /> Terminées
                </label>
              </div>
            )}

            {(vueActuelle === 'dashboard' || vueActuelle === 'public') && (
              <select className="tri-select" value={triDate} onChange={(e) => setTriDate(e.target.value)}>
                <option value="asc">Date : Plus proche</option>
                <option value="desc">Date : Plus lointaine</option>
              </select>
            )}

            {token && (
              <button onClick={openProfilePage} className="btn-secondary" style={{ padding: '8px 15px', margin: 0 }}>👤 Mon Compte</button>
            )}
          </div>
        </header>

        <div className="content-scroll">
          {erreur && <div className="alert alert-danger">{erreur}</div>}
          {succes && <div className="alert alert-success">{succes}</div>}

          {/* VUE : GESTION DES CLASSES */}
          {vueActuelle === 'gestion-classe' && role === 'enseignant' && (
             <div style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
                <div className="card" style={{flex: 1}}>
                   <h2>Élèves de {classeGeree}</h2>
                   <ul style={{listStyle: 'none', padding: 0, marginTop: '15px'}}>
                      {etudiants.filter(e => e.classe === classeGeree).map(e => (
                          <li key={e.id} style={{padding: '10px', borderBottom: '1px solid var(--border-color)'}}>
                             <strong>{e.nom} {e.prenom}</strong> <br/>
                             <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>📧 {e.mail}</span>
                          </li>
                      ))}
                      {etudiants.filter(e => e.classe === classeGeree).length === 0 && (
                          <li style={{color: 'var(--text-muted)'}}>Aucun élève dans cette classe.</li>
                      )}
                   </ul>
                </div>
                <div className="card" style={{flex: 1}}>
                   <h2>Ajouter un élève</h2>
                   <ul style={{listStyle: 'none', padding: 0, marginTop: '15px', maxHeight: '500px', overflowY: 'auto'}}>
                      {etudiants.filter(e => e.classe !== classeGeree).map(e => (
                          <li key={e.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-color)'}}>
                             <div>
                                <strong>{e.nom} {e.prenom}</strong> <br/>
                                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Classe actuelle : {e.classe || 'Aucune'}</span>
                             </div>
                             <button onClick={() => handleAssignerClasse(e.id, classeGeree)} className="btn-secondary" style={{padding: '5px 10px', margin: 0}}>➕ Ajouter</button>
                          </li>
                      ))}
                   </ul>
                </div>
             </div>
          )}

          {/* AFFICHAGE DES ANNONCES */}
          {token && (vueActuelle === 'dashboard') && annonces.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
               <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>📢 Annonces</h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {annonces.map(ann => (
                     <div key={ann.id} style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                           <strong style={{ color: 'var(--primary)' }}>{ann.prenom} {ann.nom} <span className="badge badge-primary" style={{ marginLeft: '10px' }}>{ann.classe_cible}</span></strong>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(ann.date_creation)}</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-line', margin: '0 0 15px 0' }}>{ann.message}</p>
                        {ann.sae_id && (
                           <button onClick={() => openSaeDetails(ann.sae_id)} className="btn-secondary" style={{ margin: 0, padding: '5px 10px', fontSize: '0.9rem' }}>
                              🔗 Accéder à la SAE : {ann.sae_nom}
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* VUE : DASHBOARD / PUBLIC */}
          {(vueActuelle === 'dashboard' || vueActuelle === 'public') && (
            <div className="sae-grid">
              {loading ? <p>Chargement des ressources...</p> : 
               getSaesTriees(saes).length > 0 ? getSaesTriees(saes).map(sae => {
                 const statut = determinerStatut(sae);
                 let pourcentage = 0;
                 if (role === 'enseignant' && sae.nb_etudiants_cibles > 0) {
                     pourcentage = Math.round((sae.nb_rendus / sae.nb_etudiants_cibles) * 100);
                 }
                 return (
                  <div key={sae.id} className="card" style={{ cursor: token ? 'pointer' : 'default' }} onClick={() => token && openSaeDetails(sae.id)}>
                    <div className="card-header">
                      <span className="badge badge-primary">{sae.classe_cible}</span>
                      {role === 'etudiant' && <span className={`badge badge-${statut.couleur}`}>{statut.texte}</span>}
                      {sae.statut === 'en_attente' && <span style={{backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '10px'}}>⚠️ En attente de validation</span>}
                    </div>
                    
                    {role === 'admin' && sae.statut === 'en_attente' && (
                       <button onClick={(e) => handleValidateSae(sae.id, e)} style={{background: '#10b981', color: 'white', padding: '8px', border: 'none', borderRadius: '5px', width: '100%', marginTop: '10px', cursor: 'pointer'}}>
                          ✅ Valider et Publier cette SAE
                       </button>
                    )}

                    <h3 className="card-title">{sae.nom}</h3>
                    <p className="card-desc" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{sae.description}</p>
                    <div className="card-meta">
                      {sae.date_rendu && <span>📅 À rendre : {formatDateTime(sae.date_rendu)}</span>}
                    </div>
                    {role === 'enseignant' && (
                       <div style={{ marginTop: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                             <span>Progression des rendus</span>
                             <span>{sae.nb_rendus} / {sae.nb_etudiants_cibles} ({pourcentage}%)</span>
                          </div>
                          <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                             <div style={{ width: `${pourcentage}%`, backgroundColor: pourcentage === 100 ? 'var(--success)' : 'var(--primary)', height: '100%', transition: 'width 0.3s' }}></div>
                          </div>
                       </div>
                    )}
                    {token && role === 'etudiant' && <button className="btn-secondary" style={{width:'100%', marginTop:'1rem'}}>Voir & Rendre le travail</button>}
                    {token && role !== 'etudiant' && <button className="btn-secondary" style={{width:'100%', marginTop:'1rem'}}>Ouvrir la SAE</button>}
                  </div>
                 );
              }) : <p className="text-muted">Aucune SAE ne correspond à vos filtres.</p>}
            </div>
          )}

          {/* VUE : DÉTAILS DE LA SAE */}
          {vueActuelle === 'sae-details' && selectedSae && (
            <div className="admin-layout">
              <div className="card" style={{marginBottom: '2rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                   <h2>{selectedSae.nom}</h2>
                   <div>
                     {(role === 'enseignant' || role === 'admin') && (
                        <button onClick={() => openEditSae(selectedSae)} className="btn-primary" style={{marginRight: '10px', background: '#3b82f6', borderColor: '#3b82f6'}}>✏️ Modifier</button>
                     )}
                     <button onClick={() => setVueActuelle('dashboard')} className="btn-secondary">🔙 Retour</button>
                   </div>
                </div>
                {selectedSae.date_rendu && <p style={{fontWeight:'bold', color:'var(--danger)', marginTop:'10px'}}>📅 Date limite : {formatDateTime(selectedSae.date_rendu)}</p>}
                
                <div style={{backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid var(--border-color)'}}>
                   <p style={{whiteSpace: 'pre-line'}}>{selectedSae.description}</p>
                </div>

                {selectedSae.documents && JSON.parse(selectedSae.documents).length > 0 && (
                   <div style={{marginTop: '1.5rem'}}>
                     <h3>📎 Ressources fournies</h3>
                     <div className="file-links" style={{marginTop:'10px'}}>
                        {JSON.parse(selectedSae.documents).map((file, i) => (
                          <a key={i} href={`${SERVER_URL}/uploads/${file}`} target="_blank" rel="noreferrer" className="btn-download">
                            📄 {file.split('-').slice(1).join('-')}
                          </a>
                        ))}
                     </div>
                   </div>
                )}
              </div>

              {role === 'etudiant' && (
                 <div className="card" style={{border: selectedRendu ? '2px solid var(--success)' : '2px solid var(--primary)'}}>
                    <h2 style={{color: selectedRendu ? 'var(--success)' : 'inherit'}}>
                       {selectedRendu ? '✅ Mon travail rendu' : '📤 Déposer mon travail'}
                    </h2>
                    
                    {selectedRendu ? (
                       <div>
                         <p style={{color: 'var(--text-muted)'}}>Soumis le : {formatDateTime(selectedRendu.date_soumission)}</p>
                         <div className="file-links" style={{marginTop:'10px', marginBottom: '1.5rem'}}>
                            {JSON.parse(selectedRendu.documents).map((file, i) => (
                              <a key={i} href={`${SERVER_URL}/uploads/${file}`} target="_blank" rel="noreferrer" className="btn-secondary">
                                📁 {file.split('-').slice(1).join('-')}
                              </a>
                            ))}
                         </div>
                         <hr style={{borderColor: 'var(--border-color)', margin: '1rem 0'}}/>
                         <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Vous pouvez écraser votre rendu en déposant de nouveaux fichiers.</p>
                       </div>
                    ) : (
                       <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>
                          Sélectionnez vos fichiers (PDF, ZIP, Word...) pour valider cette SAE.
                       </p>
                    )}

                    <form onSubmit={handleSubmitRendu} style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                       <input type="file" multiple required onChange={(e) => setFichiersRendu(Array.from(e.target.files))} style={{flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px'}}/>
                       <button type="submit" className="btn-download" style={{margin: 0}}>{selectedRendu ? 'Mettre à jour' : 'Envoyer'}</button>
                    </form>
                 </div>
              )}
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
                    <input type="text" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
                <h2>Créer un compte étudiant</h2>
                <form onSubmit={handleRegister}>
                  <div className="form-row">
                    <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                    <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                  <input type="email" placeholder="Adresse Email" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
                  <input type="password" placeholder="Mot de passe (6+ car.)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
                  
                  <div className="form-group" style={{marginTop: '10px'}}>
                    <label>Sélectionnez votre classe :</label>
                    <select value={classeInscription} onChange={(e) => setClasseInscription(e.target.value)}>
                      {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-download" style={{marginTop:'15px'}}>S'inscrire</button>
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
                    <input type="text" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                      <label>Date de rendu</label>
                      <input type="datetime-local" value={dateRenduSae} onChange={(e) => setDateRenduSae(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{flex:1}}>
                      <label>Classe cible</label>
                      <select value={classeCible} onChange={(e) => setClasseCible(e.target.value)}>
                        <option value="Toutes">Toutes mes classes</option>
                        {classesDuProf.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description / Consignes</label>
                    <textarea value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required />
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

          {/* VUE : CRÉATION D'ANNONCE */}
          {vueActuelle === 'create-annonce' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'600px'}}>
                <h2>📢 Envoyer une annonce</h2>
                <form onSubmit={handleCreateAnnonce}>
                  <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                      <label>Classe cible</label>
                      <select value={classeCibleAnnonce} onChange={(e) => setClasseCibleAnnonce(e.target.value)}>
                        <option value="Toutes">Toutes mes classes</option>
                        {classesDuProf.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{flex:1}}>
                      <label>Lier à une SAE (Optionnel)</label>
                      <select value={saeLieeAnnonce} onChange={(e) => setSaeLieeAnnonce(e.target.value)}>
                        <option value="">-- Aucune SAE --</option>
                        {saes.map(sae => <option key={sae.id} value={sae.id}>{sae.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Votre message</label>
                    <textarea placeholder="Saisissez votre annonce ici..." value={messageAnnonce} onChange={(e) => setMessageAnnonce(e.target.value)} required style={{minHeight:'100px'}} />
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button type="submit" className="btn-download" style={{flex:2}}>Publier l'annonce</button>
                    <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-secondary" style={{flex:1}}>Annuler</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* VUE : MODIFICATION SAE */}
          {vueActuelle === 'edit-sae' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'600px'}}>
                <h2>Modifier la SAE</h2>
                <form onSubmit={handleEditSae}>
                  <div className="form-group">
                    <label>Nom de la SAE</label>
                    <input type="text" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                      <label>Date de rendu</label>
                      <input type="datetime-local" value={dateRenduSae} onChange={(e) => setDateRenduSae(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{flex:1}}>
                      <label>Classe cible</label>
                      <select value={classeCible} onChange={(e) => setClasseCible(e.target.value)}>
                        <option value="Toutes">Toutes mes classes</option>
                        {classesDuProf.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description / Consignes</label>
                    <textarea value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required style={{minHeight:'150px'}} />
                  </div>
                  <div className="form-group">
                    <label>Ajouter des fichiers joints</label>
                    <input type="file" multiple onChange={(e) => setFichiersSae(Array.from(e.target.files))} />
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button type="submit" className="btn-download" style={{flex:2}}>Enregistrer les modifications</button>
                    <button type="button" onClick={() => { setSelectedSae(null); setVueActuelle('dashboard'); }} className="btn-secondary" style={{flex:1}}>Annuler</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VUE : PROFIL */}
          {vueActuelle === 'profile' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'600px'}}>
                <h2>👤 Mon Compte</h2>
                {profilMessage && <div className="alert alert-success">{profilMessage}</div>}
                
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                       <label>Prénom</label>
                       <input type="text" value={profilData.prenom} onChange={(e) => setProfilData({...profilData, prenom: e.target.value})} required/>
                    </div>
                    <div className="form-group" style={{flex:1}}>
                       <label>Nom</label>
                       <input type="text" value={profilData.nom} onChange={(e) => setProfilData({...profilData, nom: e.target.value})} required/>
                    </div>
                  </div>
                  
                  <div className="form-group">
                     <label>Adresse e-mail</label>
                     <input type="email" value={profilData.mail} onChange={(e) => setProfilData({...profilData, mail: e.target.value})} required />
                  </div>

                  <div className="form-group">
                    <label>Mes classes (Mises à jour)</label>
                    {role === 'etudiant' ? (
                        <select value={profilData.classeEtudiant} onChange={(e) => setProfilData({...profilData, classeEtudiant: e.target.value})}>
                          {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', backgroundColor:'var(--bg-color)', border:'1px solid var(--border-color)', borderRadius:'8px' }}>
                          {CLASSES_DISPOS.map(c => (
                            <label key={c} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={profilData.classesEns.includes(c)} onChange={(e) => {
                                  if (e.target.checked) setProfilData({...profilData, classesEns: [...profilData.classesEns, c]});
                                  else setProfilData({...profilData, classesEns: profilData.classesEns.filter(cls => cls !== c)});
                                }} /> {c}
                            </label>
                          ))}
                        </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" className="btn-download" style={{ flex: 2 }}>Enregistrer</button>
                    <button type="button" onClick={() => setVueActuelle('dashboard')} className="btn-secondary" style={{ flex: 1 }}>Retour</button>
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
                <div className="form-row" style={{alignItems:'center', gap:'20px'}}>
                  <input type="number" min="1" max="50" value={quantiteGeneration} onChange={(e) => setQuantiteGeneration(e.target.value)} style={{width:'100px'}} />
                  <button onClick={() => handleGenerate('users')} className="btn-secondary">👤 Générer Utilisateurs</button>
                  <button onClick={() => handleGenerate('saes')} className="btn-secondary">📚 Générer SAEs</button>
                </div>
              </div>

              {/* NOUVEAU : FORMULAIRE DE CRÉATION MANUELLE ADMIN */}
              <div className="card" style={{marginBottom: '2rem'}}>
                <h2>Créer un compte manuellement</h2>
                <p className="text-muted" style={{marginBottom:'1rem'}}>Permet de créer un compte Enseignant (ou Étudiant sur mesure).</p>
                <form onSubmit={handleAdminSaveUser}>
                   <div className="form-row">
                      <input type="text" placeholder="Prénom" value={adminNewPrenom} onChange={e => setAdminNewPrenom(e.target.value)} required style={{flex: 1}}/>
                      <input type="text" placeholder="Nom" value={adminNewNom} onChange={e => setAdminNewNom(e.target.value)} required style={{flex: 1}}/>
                   </div>
                   <div className="form-row">
                      <input type="email" placeholder="Email de connexion" value={adminNewMail} onChange={e => setAdminNewMail(e.target.value)} required style={{flex: 1}}/>
                      <input type="text" placeholder="Mot de passe provisoire" value={adminNewPwd} onChange={e => setAdminNewPwd(e.target.value)} style={{flex: 1}}/>
                   </div>
                   
                   <div className="form-group" style={{marginTop: '10px'}}>
                      <label>Rôle du compte :</label>
                      <select value={adminNewRole} onChange={e => setAdminNewRole(e.target.value)}>
                         <option value="enseignant">Professeur / Enseignant</option>
                         <option value="etudiant">Étudiant</option>
                      </select>
                   </div>

                   {adminNewRole === 'enseignant' ? (
                      <div className="form-group">
                         <label>Classes gérées par ce professeur :</label>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
                           {CLASSES_DISPOS.map(c => (
                             <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                               <input type="checkbox" checked={adminNewClasses.includes(c)} onChange={(e) => {
                                   if (e.target.checked) setAdminNewClasses([...adminNewClasses, c]);
                                   else setAdminNewClasses(adminNewClasses.filter(cls => cls !== c));
                                 }} /> {c}
                             </label>
                           ))}
                         </div>
                      </div>
                   ) : (
                      <div className="form-group">
                         <label>Classe de l'élève :</label>
                         <select value={adminNewClasses[0] || CLASSES_DISPOS[0]} onChange={e => setAdminNewClasses([e.target.value])}>
                           {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                   )}

                   {/* LES BOUTONS DU FORMULAIRE DE L'ADMIN */}
                   <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button type="submit" className="btn-secondary">{isEditingUser ? 'Enregistrer les modifications' : 'Créer le compte'}</button>
                      {isEditingUser && (
                         <button type="button" onClick={() => { setIsEditingUser(false); setAdminNewNom(''); setAdminNewPrenom(''); setAdminNewMail(''); setAdminNewPwd(''); }} style={{background: 'transparent', border: '1px solid #ccc', padding: '8px', borderRadius: '5px', cursor: 'pointer'}}>Annuler</button>
                      )}
                   </div>
                </form>
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
                          <td>{user.classe && user.classe.startsWith('[') ? JSON.parse(user.classe).join(', ') : (user.classe || '-')}</td>
                          
                          {/* L'AJOUT DES BOUTONS EDITER ET SE CONNECTER POUR L'ADMIN */}
                          <td>
                            <button onClick={() => openAdminEditUser(user)} style={{marginRight: '5px', padding: '5px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>✏️ Éditer</button>
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