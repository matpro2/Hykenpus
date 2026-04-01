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
      // Redirection : l'admin va sur son panneau, les autres sur le dashboard
      if (['public', 'login', 'register'].includes(vueActuelle)) {
        setVueActuelle(role === 'admin' ? 'admin' : 'dashboard');
      }
      
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
      saveAuthData(data); 
      setVueActuelle(data.role === 'admin' ? 'admin' : 'dashboard');
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
        <div className="logo">
          <span style={{background: 'var(--primary)', color: 'white', padding: '5px 8px', borderRadius: '8px'}}>HK</span>
          <span>Hykenpus</span>
        </div>
        
        <nav className="nav-group">
          {/* Dashboard uniquement pour les non-admins */}
          {role !== 'admin' && (
            <>
              <span className="nav-label">Menu Principal</span>
              <div className={`nav-item ${['dashboard', 'public'].includes(vueActuelle) ? 'active' : ''}`} 
                   onClick={() => setVueActuelle(token ? 'dashboard' : 'public')}>
                <i className="fa-solid fa-house icon"></i> <span>Dashboard</span>
              </div>
            </>
          )}
          
          {token && (role === 'enseignant' || role === 'admin') && (
            <>
              <span className="nav-label">Sujets</span>
              <div className={`nav-item ${vueActuelle === 'create-sae' ? 'active' : ''}`} onClick={() => setVueActuelle('create-sae')}>
                <i className="fa-solid fa-folder-plus icon"></i> <span>Nouveau Sujet</span>
              </div>
              <div className={`nav-item ${vueActuelle === 'create-annonce' ? 'active' : ''}`} onClick={() => setVueActuelle('create-annonce')}>
                <i className="fa-solid fa-bullhorn icon"></i> <span>Annonces</span>
              </div>
            </>
          )}

          {token && role === 'enseignant' && classesDuProf.length > 0 && (
             <>
               <span className="nav-label">Mes Classes</span>
               {classesDuProf.map(c => (
                  <div key={c} 
                       className={`nav-item ${vueActuelle === 'gestion-classe' && classeGeree === c ? 'active' : ''}`} 
                       onClick={() => { setClasseGeree(c); setVueActuelle('gestion-classe'); }}>
                    <i className="fa-solid fa-graduation-cap icon"></i> <span>Classe {c}</span>
                  </div>
               ))}
             </>
          )}

          {token && role === 'admin' && (
            <>
              <span className="nav-label">Système</span>
              <div className={`nav-item ${vueActuelle === 'admin' ? 'active' : ''}`} onClick={() => setVueActuelle('admin')}>
                <i className="fa-solid fa-shield-halved icon"></i> <span>Administration</span>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item theme-toggle" onClick={toggleTheme}>
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} icon`}></i> 
            <span>{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-layout" style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
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
          
          <div className="header-actions" style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
            {/* FILTRES ET TRI : uniquement si pas admin et sur dashboard */}
            {role !== 'admin' && (vueActuelle === 'dashboard' || vueActuelle === 'public') && (
              <>
                {role === 'etudiant' && (
                  <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem' }}>
                    <label><input type="checkbox" checked={filtresStatut.includes('En cours')} onChange={() => toggleFiltreStatut('En cours')} /> En cours</label>
                    <label><input type="checkbox" checked={filtresStatut.includes('En retard')} onChange={() => toggleFiltreStatut('En retard')} /> En retard</label>
                    <label><input type="checkbox" checked={filtresStatut.includes('Terminée')} onChange={() => toggleFiltreStatut('Terminée')} /> Terminées</label>
                  </div>
                )}
                <select className="tri-select" value={triDate} onChange={(e) => setTriDate(e.target.value)}>
                  <option value="asc">Tri : Proche</option>
                  <option value="desc">Tri : Lointain</option>
                </select>
              </>
            )}

            {/* ESPACE COMPTE (DROITE) */}
            <div className="header-user-zone" style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingLeft: '15px', borderLeft: '1px solid var(--border)' }}>
              {token ? (
                <>
                  <div className="user-profile-header" onClick={openProfilePage} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="user-name" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{prenomUser}</span>
                    <span className="user-role" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</span>
                  </div>
                  <button onClick={handleLogout} className="btn-icon-logout" style={{ background: 'var(--primary-soft)', border: 'none', color: 'var(--primary)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setVueActuelle('login')} className="btn-primary" style={{ padding: '8px 15px' }}>Connexion</button>
                  <button onClick={() => setVueActuelle('register')} className="btn-secondary" style={{ padding: '8px 15px', margin: 0 }}>S'inscrire</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-scroll">
          {erreur && <div className="alert alert-danger" style={{animation: 'slideIn 0.3s ease'}}>{erreur}</div>}
          {succes && <div className="alert alert-success">{succes}</div>}

          {/* VUE : ANNONCES (Masqué pour admin) */}
          {token && role !== 'admin' && (vueActuelle === 'dashboard') && annonces.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
               <h2 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-bullhorn" style={{marginRight: '10px', color: 'var(--primary)'}}></i> Annonces récentes</h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {annonces.map(ann => (
                     <div key={ann.id} className="card" style={{ padding: '1.25rem', cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <strong style={{ color: 'var(--primary)' }}>{ann.prenom} {ann.nom} <span className="badge badge-primary">{ann.classe_cible}</span></strong>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><i className="fa-solid fa-calendar-day" style={{marginRight: '5px'}}></i>{formatDateTime(ann.date_creation)}</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-line', fontSize: '0.95rem' }}>{ann.message}</p>
                        {ann.sae_id && (
                           <button onClick={() => openSaeDetails(ann.sae_id)} className="btn-secondary" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                             <i className="fa-solid fa-link" style={{marginRight: '8px'}}></i> Voir SAE : {ann.sae_nom}
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* VUE : DASHBOARD / PUBLIC (Grille de SAEs) - MASQUÉ POUR ADMIN */}
          {(vueActuelle === 'dashboard' || vueActuelle === 'public') && role !== 'admin' && (
            <div className="sae-grid">
              {loading ? <p>Chargement des ressources...</p> : 
               getSaesTriees(saes).map(sae => {
                const statut = determinerStatut(sae);
                const pourcentage = sae.nb_etudiants_cibles > 0 ? Math.round((sae.nb_rendus / sae.nb_etudiants_cibles) * 100) : 0;
                
                return (
                  <div key={sae.id} className="card" onClick={() => token && openSaeDetails(sae.id)}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span className="badge badge-primary">{sae.classe_cible}</span>
                      <span className={`badge badge-${statut.couleur}`}>{statut.texte}</span>
                    </div>
                    
                    <h3 className="card-title">{sae.nom}</h3>
                    <p className="card-desc">{sae.description.substring(0, 100)}...</p>
                    
                    <div className="card-footer" style={{marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px'}}>
                        <span style={{color: 'var(--text-muted)'}}><i className="fa-solid fa-calendar-days" style={{marginRight: '5px'}}></i> {formatDateTime(sae.date_rendu) || 'Sans date'}</span>
                      </div>
                      
                      {role === 'enseignant' && (
                        <div className="progress-section" style={{marginTop: '10px'}}>
                          <div className="progress-container" style={{height: '6px', backgroundColor: 'var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '5px'}}>
                            <div className="progress-bar" style={{width: `${pourcentage}%`, height: '100%', backgroundColor: 'var(--primary)'}}></div>
                          </div>
                          <span style={{fontSize: '0.75rem', fontWeight: '600'}}>{pourcentage}% rendus</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loading && saes.length === 0 && <p className="text-muted">Aucune SAE disponible.</p>}
            </div>
          )}

          {/* VUE : DÉTAILS DE LA SAE */}
          {vueActuelle === 'sae-details' && selectedSae && (
            <div className="admin-layout">
              <div className="card" style={{marginBottom: '2rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <h2>{selectedSae.nom}</h2>
                    <div style={{display:'flex', gap:'10px'}}>
                      {(role === 'enseignant' || role === 'admin') && (
                         <button onClick={() => openEditSae(selectedSae)} className="btn-primary"><i className="fa-solid fa-pen-to-square" style={{marginRight: '8px'}}></i> Modifier</button>
                      )}
                      <button onClick={() => setVueActuelle(role === 'admin' ? 'admin' : 'dashboard')} className="btn-secondary"><i className="fa-solid fa-arrow-left" style={{marginRight: '8px'}}></i> Retour</button>
                    </div>
                </div>
                {selectedSae.date_rendu && <p style={{fontWeight:'bold', color:'var(--danger)', marginTop:'10px'}}><i className="fa-solid fa-clock" style={{marginRight: '8px'}}></i> Date limite : {formatDateTime(selectedSae.date_rendu)}</p>}
                
                <div style={{backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '8px', marginTop: '1.25rem', border: '1px solid var(--border)'}}>
                    <p style={{whiteSpace: 'pre-line'}}>{selectedSae.description}</p>
                </div>

                {selectedSae.documents && JSON.parse(selectedSae.documents).length > 0 && (
                   <div style={{marginTop: '2rem'}}>
                     <h3><i className="fa-solid fa-paperclip" style={{marginRight: '10px'}}></i> Ressources fournies</h3>
                     <div className="file-links" style={{marginTop:'12px', display:'flex', flexWrap:'wrap', gap:'10px'}}>
                        {JSON.parse(selectedSae.documents).map((file, i) => (
                          <a key={i} href={`${SERVER_URL}/uploads/${file}`} target="_blank" rel="noreferrer" className="btn-download">
                            <i className="fa-solid fa-file-pdf"></i> {file.split('-').slice(1).join('-')}
                          </a>
                        ))}
                     </div>
                   </div>
                )}
              </div>

              {role === 'etudiant' && (
                  <div className="card" style={{border: selectedRendu ? '2px solid var(--success)' : '2px solid var(--primary)'}}>
                     <h2 style={{color: selectedRendu ? 'var(--success)' : 'inherit'}}>
                         {selectedRendu ? <><i className="fa-solid fa-circle-check" style={{marginRight: '10px'}}></i> Travail rendu</> : <><i className="fa-solid fa-upload" style={{marginRight: '10px'}}></i> Déposer mon travail</>}
                     </h2>
                     {selectedRendu ? (
                        <div>
                          <p style={{color: 'var(--text-muted)'}}>Soumis le : {formatDateTime(selectedRendu.date_soumission)}</p>
                          <div className="file-links" style={{marginTop:'12px', marginBottom: '1.5rem', display:'flex', gap:'10px'}}>
                             {JSON.parse(selectedRendu.documents).map((file, i) => (
                               <a key={i} href={`${SERVER_URL}/uploads/${file}`} target="_blank" rel="noreferrer" className="btn-secondary">
                                 <i className="fa-solid fa-file-arrow-up"></i> {file.split('-').slice(1).join('-')}
                               </a>
                             ))}
                          </div>
                        </div>
                     ) : (
                        <p style={{color: 'var(--text-muted)', marginBottom: '1.25rem'}}>Sélectionnez vos fichiers (PDF, ZIP...) pour valider cette SAE.</p>
                     )}
                     <form onSubmit={handleSubmitRendu} style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input type="file" multiple required onChange={(e) => setFichiersRendu(Array.from(e.target.files))} style={{flex: 1}}/>
                        <button type="submit" className="btn-primary" style={{margin: 0}}>
                          <i className="fa-solid fa-paper-plane" style={{marginRight: '8px'}}></i> {selectedRendu ? 'Mettre à jour' : 'Envoyer'}
                        </button>
                     </form>
                  </div>
              )}
            </div>
          )}

          {/* VUE : LOGIN */}
          {vueActuelle === 'login' && (
            <div className="form-card-container">
              <div className="card form-card">
                <h2 style={{textAlign:'center', marginBottom:'1.5rem'}}>Connexion</h2>
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label>E-mail ou Identifiant</label>
                    <input type="text" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required placeholder="exemple@univ.fr" />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'0.5rem'}}>Se connecter</button>
                </form>
                <button onClick={() => setVueActuelle('public')} className="btn-secondary" style={{marginTop: '1rem', width: '100%'}}>Retour à l'accueil</button>
              </div>
            </div>
          )}

          {/* VUE : REGISTER */}
          {vueActuelle === 'register' && (
            <div className="form-card-container">
              <div className="card form-card">
                <h2 style={{textAlign:'center', marginBottom:'1.5rem'}}>Créer un compte</h2>
                <form onSubmit={handleRegister}>
                  <div className="form-row" style={{display:'flex', gap:'10px', marginBottom:'1rem'}}>
                    <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                    <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <input type="email" placeholder="Adresse Email" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <input type="password" placeholder="Mot de passe (6+ car.)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
                  </div>
                  <div className="form-group">
                    <label>Sélectionnez votre classe :</label>
                    <select value={classeInscription} onChange={(e) => setClasseInscription(e.target.value)}>
                      {CLASSES_DISPOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{marginTop:'10px', width:'100%'}}>S'inscrire</button>
                  <button type="button" onClick={() => setVueActuelle('login')} className="btn-secondary" style={{marginTop: '1rem', width: '100%'}}>Déjà inscrit ?</button>
                </form>
              </div>
            </div>
          )}

          {/* VUE : ADMIN */}
          {vueActuelle === 'admin' && (
            <div className="admin-layout">
              <div className="card" style={{marginBottom: '2rem'}}>
                <h2><i className="fa-solid fa-gears" style={{marginRight: '10px'}}></i> Générateur de données</h2>
                <div className="form-row" style={{display:'flex', alignItems:'center', gap:'15px', marginTop:'15px'}}>
                  <input type="number" min="1" max="50" value={quantiteGeneration} onChange={(e) => setQuantiteGeneration(e.target.value)} style={{width:'80px'}} />
                  <button onClick={() => handleGenerate('users')} className="btn-secondary"><i className="fa-solid fa-users" style={{marginRight: '8px'}}></i> Utilisateurs</button>
                  <button onClick={() => handleGenerate('saes')} className="btn-secondary"><i className="fa-solid fa-book" style={{marginRight: '8px'}}></i> SAEs</button>
                </div>
              </div>

              <div className="card" style={{marginBottom: '2rem'}}>
                <h2>{isEditingUser ? <><i className="fa-solid fa-user-pen"></i> Modifier</> : <><i className="fa-solid fa-user-plus"></i> Créer</>} un compte</h2>
                <form onSubmit={handleAdminSaveUser} style={{marginTop:'15px'}}>
                   <div className="form-row" style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                      <input type="text" placeholder="Prénom" value={adminNewPrenom} onChange={e => setAdminNewPrenom(e.target.value)} required />
                      <input type="text" placeholder="Nom" value={adminNewNom} onChange={e => setAdminNewNom(e.target.value)} required />
                   </div>
                   <div className="form-row" style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                      <input type="email" placeholder="Email" value={adminNewMail} onChange={e => setAdminNewMail(e.target.value)} required />
                      <input type="text" placeholder="Mot de passe (optionnel)" value={adminNewPwd} onChange={e => setAdminNewPwd(e.target.value)} />
                   </div>
                   <div className="form-group">
                      <label>Rôle :</label>
                      <select value={adminNewRole} onChange={e => setAdminNewRole(e.target.value)}>
                         <option value="enseignant">Enseignant</option>
                         <option value="etudiant">Étudiant</option>
                      </select>
                   </div>
                   <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button type="submit" className="btn-primary">{isEditingUser ? 'Enregistrer' : 'Créer le compte'}</button>
                      {isEditingUser && <button type="button" className="btn-secondary" onClick={() => setIsEditingUser(false)}>Annuler</button>}
                   </div>
                </form>
              </div>

              <div className="card">
                <h2><i className="fa-solid fa-table-list" style={{marginRight: '10px'}}></i> Liste des utilisateurs</h2>
                <div style={{overflowX: 'auto', marginTop:'15px'}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>Rôle</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listeUtilisateurs.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div style={{fontWeight:'600'}}>{user.prenom} {user.nom}</div>
                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{user.mail}</div>
                          </td>
                          <td><span className={`badge badge-${user.role === 'admin' ? 'warning' : 'primary'}`}>{user.role}</span></td>
                          <td>
                            <div style={{display:'flex', gap:'5px'}}>
                              <button onClick={() => openAdminEditUser(user)} className="btn-primary" style={{padding:'5px 10px'}} title="Modifier">
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              {user.role !== 'admin' && (
                                <button onClick={() => handleImpersonate(user.id)} className="btn-secondary" style={{padding:'5px 10px'}} title="Se connecter en tant que">
                                  <i className="fa-solid fa-mask"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VUE : CREATE SAE */}
          {vueActuelle === 'create-sae' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'650px'}}>
                <h2><i className="fa-solid fa-file-circle-plus" style={{marginRight: '10px'}}></i> Publier un nouveau sujet</h2>
                <form onSubmit={handleCreateSae} style={{marginTop:'1.5rem'}}>
                  <div className="form-group">
                    <label>Nom de la SAE</label>
                    <input type="text" value={nomSae} onChange={(e) => setNomSae(e.target.value)} required placeholder="Ex: SAE 301 - Développement Web" />
                  </div>
                  <div className="form-row" style={{display:'flex', gap:'15px'}}>
                    <div className="form-group" style={{flex:1}}>
                      <label><i className="fa-solid fa-calendar-check" style={{marginRight: '5px'}}></i> Date de rendu</label>
                      <input type="datetime-local" value={dateRenduSae} onChange={(e) => setDateRenduSae(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{flex:1}}>
                      <label><i className="fa-solid fa-users-rectangle" style={{marginRight: '5px'}}></i> Classe cible</label>
                      <select value={classeCible} onChange={(e) => setClasseCible(e.target.value)}>
                        <option value="Toutes">Toutes mes classes</option>
                        {classesDuProf.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Consignes et objectifs</label>
                    <textarea value={descriptionSae} onChange={(e) => setDescriptionSae(e.target.value)} required placeholder="Détaillez ici les instructions..." style={{minHeight:'180px'}} />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-paperclip" style={{marginRight: '5px'}}></i> Fichiers ressources (PDF, ZIP...)</label>
                    <input type="file" multiple onChange={(e) => setFichiersSae(Array.from(e.target.files))} />
                  </div>
                  <div style={{display:'flex', gap:'12px', marginTop:'10px'}}>
                    <button type="submit" className="btn-primary" style={{flex:2}}>Publier la SAE</button>
                    <button type="button" onClick={() => setVueActuelle(role === 'admin' ? 'admin' : 'dashboard')} className="btn-secondary" style={{flex:1}}>Annuler</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VUE : PROFILE */}
          {vueActuelle === 'profile' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'550px'}}>
                <h2 style={{textAlign:'center'}}><i className="fa-solid fa-id-card" style={{marginRight: '12px'}}></i> Paramètres du compte</h2>
                {profilMessage && <div className="alert alert-success" style={{marginTop:'1rem'}}>{profilMessage}</div>}
                <form onSubmit={handleUpdateProfile} style={{marginTop:'1.5rem'}}>
                  <div className="form-row" style={{display:'flex', gap:'10px', marginBottom:'1rem'}}>
                    <div style={{flex:1}}>
                      <label>Prénom</label>
                      <input type="text" value={profilData.prenom} onChange={(e) => setProfilData({...profilData, prenom: e.target.value})} required/>
                    </div>
                    <div style={{flex:1}}>
                      <label>Nom</label>
                      <input type="text" value={profilData.nom} onChange={(e) => setProfilData({...profilData, nom: e.target.value})} required/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email professionnel</label>
                    <input type="email" value={profilData.mail} onChange={(e) => setProfilData({...profilData, mail: e.target.value})} required />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>Mettre à jour</button>
                    <button type="button" onClick={() => setVueActuelle(role === 'admin' ? 'admin' : 'dashboard')} className="btn-secondary" style={{ flex: 1 }}>Retour</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VUE : GESTION CLASSE */}
          {vueActuelle === 'gestion-classe' && (
            <div className="admin-layout">
              <div style={{display:'flex', gap:'25px', flexWrap:'wrap'}}>
                 <div className="card" style={{flex:1, minWidth:'300px'}}>
                    <h3><i className="fa-solid fa-user-graduate" style={{marginRight: '10px'}}></i> Liste des élèves ({classeGeree})</h3>
                    <div style={{marginTop:'1rem'}}>
                      {etudiants.filter(e => e.classe === classeGeree).map(e => (
                        <div key={e.id} style={{padding:'12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between'}}>
                          <span>{e.nom} {e.prenom}</span>
                          <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{e.mail}</span>
                        </div>
                      ))}
                      {etudiants.filter(e => e.classe === classeGeree).length === 0 && <p className="text-muted">Aucun élève trouvé.</p>}
                    </div>
                 </div>
                 <div className="card" style={{flex:1, minWidth:'300px'}}>
                    <h3><i className="fa-solid fa-user-plus" style={{marginRight: '10px'}}></i> Ajouter des élèves</h3>
                    <p className="text-muted" style={{marginTop:'10px'}}>Ici s'affichera la liste des étudiants sans classe assignée.</p>
                 </div>
              </div>
            </div>
          )}

          {/* VUE : CREATE ANNONCE */}
          {vueActuelle === 'create-annonce' && (
            <div className="form-card-container">
              <div className="card form-card" style={{maxWidth:'600px'}}>
                <h2><i className="fa-solid fa-bullhorn" style={{marginRight: '12px'}}></i> Nouvelle annonce</h2>
                <form onSubmit={handleCreateAnnonce} style={{marginTop:'1.5rem'}}>
                  <div className="form-group">
                    <label>Message public</label>
                    <textarea value={messageAnnonce} onChange={e => setMessageAnnonce(e.target.value)} placeholder="Écrivez votre message ici pour informer les étudiants..." required style={{minHeight:'180px'}} />
                  </div>
                  <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'10px'}}>
                    <i className="fa-solid fa-paper-plane" style={{marginRight: '10px'}}></i> Publier l'annonce
                  </button>
                  <button type="button" onClick={() => setVueActuelle(role === 'admin' ? 'admin' : 'dashboard')} className="btn-secondary" style={{width:'100%', marginTop:'10px'}}>Annuler</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;