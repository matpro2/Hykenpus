// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); 
const { open } = require('sqlite'); 
const multer = require('multer'); 
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); 
}
app.use('/uploads', express.static(uploadDir)); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); 
    }
});
const upload = multer({ storage: storage });

let db; 

async function initDB() {
    db = await open({
        filename: './mmi_hub.sqlite', 
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS Comptes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            mail TEXT UNIQUE NOT NULL,
            mot_de_passe TEXT NOT NULL,
            role TEXT NOT NULL,
            classe TEXT
        );
        
        CREATE TABLE IF NOT EXISTS SAE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            auteur_id INTEGER NOT NULL,
            description TEXT,
            date_creation TEXT,
            documents TEXT,
            date_rendu TEXT,
            classe_cible TEXT,
            statut TEXT DEFAULT 'validee', 
            est_publique INTEGER DEFAULT 0,
            afficher_rendus INTEGER DEFAULT 0,
            FOREIGN KEY (auteur_id) REFERENCES Comptes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Rendus (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sae_id INTEGER NOT NULL,
            etudiant_id INTEGER NOT NULL,
            date_soumission TEXT NOT NULL,
            documents TEXT,
            FOREIGN KEY (sae_id) REFERENCES SAE(id) ON DELETE CASCADE,
            FOREIGN KEY (etudiant_id) REFERENCES Comptes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Annonces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auteur_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            classe_cible TEXT NOT NULL,
            sae_id INTEGER,
            date_creation TEXT NOT NULL,
            FOREIGN KEY (auteur_id) REFERENCES Comptes(id) ON DELETE CASCADE,
            FOREIGN KEY (sae_id) REFERENCES SAE(id) ON DELETE CASCADE
        );
    `);

    const adminExists = await db.get('SELECT * FROM Comptes WHERE mail = ?', ['Admin']);
    if (!adminExists) {
        const hashedAdminPw = await bcrypt.hash('Admin', 10);
        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)',
            ['Système', 'Admin', 'Admin', hashedAdminPw, 'admin', '["Toutes"]']
        );
    }
    console.log("✅ Base de données locale prête !");
}

// --- INITIALISATION SECURISEE ---
initDB().catch(err => {
    console.error("❌ Erreur critique lors de l'initialisation de la BDD :", err);
});

// ==========================================
// ⚠️ MIDDLEWARE AUTHENTIFICATION
// ==========================================
const verifierToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Accès refusé" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Token invalide" });
        req.user = user;
        next(); 
    });
};

// ==========================================
// ROUTES PUBLIQUES
// ==========================================
app.post('/api/register', async (req, res) => {
    const { nom, prenom, mail, password, classe } = req.body;
    try {
        const existingUsers = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) return res.status(400).json({ message: "Cet email est déjà utilisé" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const classeUser = classe || 'MMI-A1';

        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)',
            [nom, prenom, mail, hashedPassword, 'etudiant', classeUser]
        );
        res.status(201).json({ message: "Compte créé avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});

app.post('/api/login', async (req, res) => {
    const { mail, password } = req.body;
    try {
        const users = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (users.length === 0) return res.status(401).json({ message: "Identifiants incorrects" });

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.mot_de_passe);
        if (!isValidPassword) return res.status(401).json({ message: "Identifiants incorrects" });

        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role, classe: user.classe }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom, classe: user.classe });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

app.get('/api/public/sae', async (req, res) => {
    try {
        const saes = await db.all(`SELECT SAE.*, Comptes.nom AS auteur_nom, Comptes.prenom AS auteur_prenom FROM SAE JOIN Comptes ON SAE.auteur_id = Comptes.id WHERE SAE.statut = 'validee' AND SAE.est_publique = 1`);
        
        for (let sae of saes) {
            if (sae.afficher_rendus === 1) {
                sae.rendus_publics = await db.all(`
                    SELECT Rendus.documents, Rendus.date_soumission, Comptes.prenom 
                    FROM Rendus 
                    JOIN Comptes ON Rendus.etudiant_id = Comptes.id 
                    WHERE Rendus.sae_id = ?
                `, [sae.id]);
            } else {
                sae.rendus_publics = [];
            }
        }
        res.json(saes);
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// ==========================================
// ROUTES PROTÉGÉES (SAE & RENDUS)
// ==========================================
app.get('/api/sae', verifierToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const rows = await db.all('SELECT * FROM SAE');
            return res.json(rows);
        } else if (req.user.role === 'enseignant') {
            const rows = await db.all(`
                SELECT SAE.*, 
                       (SELECT COUNT(*) FROM Rendus WHERE Rendus.sae_id = SAE.id) AS nb_rendus,
                       (SELECT COUNT(*) FROM Comptes WHERE role = 'etudiant' AND (Comptes.classe = SAE.classe_cible OR SAE.classe_cible = 'Toutes')) AS nb_etudiants_cibles
                FROM SAE WHERE auteur_id = ?
            `, [req.user.id]);
            return res.json(rows);
        } else {
            const userDb = await db.get('SELECT classe FROM Comptes WHERE id = ?', [req.user.id]);
            const rows = await db.all(`
                SELECT SAE.*, Rendus.id AS rendu_id, Rendus.date_soumission 
                FROM SAE LEFT JOIN Rendus ON SAE.id = Rendus.sae_id AND Rendus.etudiant_id = ?
                WHERE (SAE.classe_cible = ? OR SAE.classe_cible = 'Toutes') AND SAE.statut = 'validee'
            `, [req.user.id, userDb.classe]);
            return res.json(rows);
        }
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.post('/api/sae', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Non autorisé." });
    const { nom, description, date_rendu, classe_cible } = req.body;
    const est_publique = req.body.est_publique === '1' ? 1 : 0;
    const afficher_rendus = req.body.afficher_rendus === '1' ? 1 : 0;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 
    const fichiersNoms = req.files ? req.files.map(f => f.filename) : [];
    const documentsStr = JSON.stringify(fichiersNoms); 
    
    const statut = req.user.role === 'admin' ? 'validee' : 'en_attente';

    try {
        await db.run('INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu, classe_cible, statut, est_publique, afficher_rendus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [nom, auteur_id, description, date_creation, documentsStr, date_rendu, classe_cible || 'Toutes', statut, est_publique, afficher_rendus]);
        res.status(201).json({ message: "SAE créée !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.put('/api/sae/:id', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Non autorisé." });
    const saeId = req.params.id;
    const { nom, description, date_rendu, classe_cible } = req.body;
    const est_publique = req.body.est_publique === '1' ? 1 : 0;
    const afficher_rendus = req.body.afficher_rendus === '1' ? 1 : 0;
    
    try {
        const sae = await db.get('SELECT * FROM SAE WHERE id = ?', [saeId]);
        if (!sae) return res.status(404).json({ message: "SAE introuvable" });
        if (req.user.role !== 'admin' && sae.auteur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé." });

        let documentsStr = sae.documents; 
        if (req.files && req.files.length > 0) {
            const anciensDocs = JSON.parse(sae.documents || '[]');
            const nouveauxDocs = req.files.map(f => f.filename);
            documentsStr = JSON.stringify([...anciensDocs, ...nouveauxDocs]);
        }
        await db.run('UPDATE SAE SET nom = ?, description = ?, date_rendu = ?, classe_cible = ?, documents = ?, est_publique = ?, afficher_rendus = ? WHERE id = ?', [nom, description, date_rendu, classe_cible || 'Toutes', documentsStr, est_publique, afficher_rendus, saeId]);
        res.json({ message: "SAE modifiée avec succès !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur lors de la modification" }); }
});

app.get('/api/sae/:id', verifierToken, async (req, res) => {
    try {
        const sae = await db.get('SELECT * FROM SAE WHERE id = ?', [req.params.id]);
        if (!sae) return res.status(404).json({ message: "SAE introuvable" });
        let rendu = null;
        if (req.user.role === 'etudiant') {
            rendu = await db.get('SELECT * FROM Rendus WHERE sae_id = ? AND etudiant_id = ?', [req.params.id, req.user.id]);
        }
        res.json({ sae, rendu });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.post('/api/sae/:id/rendu', verifierToken, upload.array('fichiers', 5), async (req, res) => {
    if (req.user.role !== 'etudiant') return res.status(403).json({ message: "Non autorisé." });
    const sae_id = req.params.id;
    const etudiant_id = req.user.id;
    const date_soumission = new Date().toISOString(); 
    const fichiersNoms = req.files ? req.files.map(f => f.filename) : [];
    const documentsStr = JSON.stringify(fichiersNoms);
    try {
        const existing = await db.get('SELECT id FROM Rendus WHERE sae_id = ? AND etudiant_id = ?', [sae_id, etudiant_id]);
        if (existing) {
            await db.run('UPDATE Rendus SET date_soumission = ?, documents = ? WHERE id = ?', [date_soumission, documentsStr, existing.id]);
        } else {
            await db.run('INSERT INTO Rendus (sae_id, etudiant_id, date_soumission, documents) VALUES (?, ?, ?, ?)', [sae_id, etudiant_id, date_soumission, documentsStr]);
        }
        res.status(201).json({ message: "Travail rendu avec succès !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur lors du rendu" }); }
});

// ==========================================
// ROUTES PROFIL / ANNONCES / CLASSES
// ==========================================
app.get('/api/users/me', verifierToken, async (req, res) => {
    try {
        const user = await db.get('SELECT nom, prenom, mail, role, classe FROM Comptes WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: "Compte introuvable" });
        res.json(user);
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.put('/api/users/me', verifierToken, async (req, res) => {
    const { nom, prenom, mail, classe } = req.body;
    try {
        const existing = await db.get('SELECT id FROM Comptes WHERE mail = ? AND id != ?', [mail, req.user.id]);
        if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé." });
        await db.run('UPDATE Comptes SET nom = ?, prenom = ?, mail = ?, classe = ? WHERE id = ?', [nom, prenom, mail, classe, req.user.id]);
        const token = jwt.sign({ id: req.user.id, mail: mail, role: req.user.role, classe: classe }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, nom, prenom, classe, message: "Profil mis à jour !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
});

app.get('/api/enseignant/etudiants', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Refusé" });
    try {
        const etudiants = await db.all("SELECT id, nom, prenom, mail, classe FROM Comptes WHERE role = 'etudiant' ORDER BY nom ASC");
        res.json(etudiants);
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.put('/api/enseignant/etudiants/:id/classe', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Refusé" });
    const { nouvelleClasse } = req.body;
    try {
        await db.run("UPDATE Comptes SET classe = ? WHERE id = ? AND role = 'etudiant'", [nouvelleClasse, req.params.id]);
        res.json({ message: "Classe de l'élève mise à jour" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur" }); }
});

app.get('/api/annonces', verifierToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const rows = await db.all(`SELECT Annonces.*, Comptes.nom, Comptes.prenom, SAE.nom AS sae_nom FROM Annonces JOIN Comptes ON Annonces.auteur_id = Comptes.id LEFT JOIN SAE ON Annonces.sae_id = SAE.id ORDER BY Annonces.id DESC`);
            return res.json(rows);
        } else if (req.user.role === 'enseignant') {
            const rows = await db.all(`SELECT Annonces.*, Comptes.nom, Comptes.prenom, SAE.nom AS sae_nom FROM Annonces JOIN Comptes ON Annonces.auteur_id = Comptes.id LEFT JOIN SAE ON Annonces.sae_id = SAE.id WHERE Annonces.auteur_id = ? ORDER BY Annonces.id DESC`, [req.user.id]);
            return res.json(rows);
        } else {
            const userDb = await db.get('SELECT classe FROM Comptes WHERE id = ?', [req.user.id]);
            const rows = await db.all(`SELECT Annonces.*, Comptes.nom, Comptes.prenom, SAE.nom AS sae_nom FROM Annonces JOIN Comptes ON Annonces.auteur_id = Comptes.id LEFT JOIN SAE ON Annonces.sae_id = SAE.id WHERE Annonces.classe_cible = ? OR Annonces.classe_cible = 'Toutes' ORDER BY Annonces.id DESC`, [userDb.classe]);
            return res.json(rows);
        }
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.post('/api/annonces', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Refusé" });
    const { message, classe_cible, sae_id } = req.body;
    const date_creation = new Date().toISOString();
    try {
        await db.run('INSERT INTO Annonces (auteur_id, message, classe_cible, sae_id, date_creation) VALUES (?, ?, ?, ?, ?)', [req.user.id, message, classe_cible || 'Toutes', sae_id || null, date_creation]);
        res.status(201).json({ message: "Annonce publiée !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// ==========================================
// ROUTES ADMIN
// ==========================================
app.put('/api/admin/sae/:id/validate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Refusé." });
    try {
        await db.run("UPDATE SAE SET statut = 'validee' WHERE id = ?", [req.params.id]);
        res.json({ message: "SAE validée !" });
    } catch (error) { res.status(500).json({ message: "Erreur" }); }
});

app.put('/api/admin/users/:id', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Refusé." });
    const { nom, prenom, mail, password, role, classes } = req.body;
    try {
        const existing = await db.get('SELECT id FROM Comptes WHERE mail = ? AND id != ?', [mail, req.params.id]);
        if (existing) return res.status(400).json({ message: "Email déjà utilisé." });
        
        const classeUser = role === 'enseignant' ? JSON.stringify(classes || []) : (classes || 'MMI-A1');
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.run('UPDATE Comptes SET nom=?, prenom=?, mail=?, mot_de_passe=?, role=?, classe=? WHERE id=?', [nom, prenom, mail, hashedPassword, role, classeUser, req.params.id]);
        } else {
            await db.run('UPDATE Comptes SET nom=?, prenom=?, mail=?, role=?, classe=? WHERE id=?', [nom, prenom, mail, role, classeUser, req.params.id]);
        }
        res.json({ message: "Compte mis à jour !" });
    } catch (error) { res.status(500).json({ message: "Erreur" }); }
});

app.post('/api/admin/create-user', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    const { nom, prenom, mail, password, role, classes } = req.body;
    try {
        const existing = await db.get('SELECT id FROM Comptes WHERE mail = ?', [mail]);
        if (existing) return res.status(400).json({ message: "Email déjà utilisé." });
        const hashedPassword = await bcrypt.hash(password, 10);
        const classeUser = role === 'enseignant' ? JSON.stringify(classes || []) : (classes || 'MMI-A1');
        await db.run('INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)', [nom, prenom, mail, hashedPassword, role, classeUser]);
        res.status(201).json({ message: "Compte créé avec succès !" });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

app.post('/api/admin/generate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    const { type, count } = req.body;
    const limit = parseInt(count) || 5;
    const classesList = ['MMI-A1', 'MMI-A2', 'MMI-B1', 'MMI-B2', 'MMI-C1', 'MMI-C2'];
    try {
        if (type === 'users') {
            const prenoms = ['Lukas', 'Emma', 'Thomas', 'Chloe', 'Hugo', 'Lea', 'Maxime', 'Manon', 'Antoine'];
            const noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand'];
            for(let i=0; i<limit; i++) {
                const p = prenoms[Math.floor(Math.random() * prenoms.length)];
                const n = noms[Math.floor(Math.random() * noms.length)];
                const role = Math.random() > 0.8 ? 'enseignant' : 'etudiant'; 
                const mail = `${p.toLowerCase()}.${n.toLowerCase()}${Math.floor(Math.random()*1000)}@test.fr`;
                const pwd = await bcrypt.hash('password123', 10);
                let classe;
                if (role === 'enseignant') {
                    const numClasses = Math.floor(Math.random() * 3) + 1;
                    const shuffled = [...classesList].sort(() => 0.5 - Math.random());
                    classe = JSON.stringify(shuffled.slice(0, numClasses));
                } else {
                    classe = classesList[Math.floor(Math.random() * classesList.length)];
                }
                await db.run('INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)', [n, p, mail, pwd, role, classe]);
            }
            res.json({ message: `✅ ${limit} comptes générés !` });
        } else if (type === 'saes') {
            const profs = await db.all('SELECT id, classe FROM Comptes WHERE role = "enseignant"');
            if(profs.length === 0) return res.status(400).json({ message: "❌ Il faut au moins un Enseignant." });
            const sujets = ['Création site web', 'Design UI/UX', 'Montage vidéo', 'Stratégie Com'];
            for(let i=0; i<limit; i++) {
                const prof = profs[Math.floor(Math.random() * profs.length)];
                const nom = `SAE 3.0${Math.floor(Math.random() * 9) + 1} - ${sujets[Math.floor(Math.random() * sujets.length)]}`;
                const auteur_id = prof.id;
                const desc = "Description générée automatiquement.";
                const date_c = new Date().toISOString().split('T')[0];
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) - 10); 
                futureDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60)); 
                const date_r = futureDate.toISOString().slice(0, 16); 
                const docs = "[]";
                let profClasses = [];
                try { profClasses = JSON.parse(prof.classe); } catch(e) {}
                const classe = profClasses.length > 0 ? profClasses[Math.floor(Math.random() * profClasses.length)] : 'Toutes';
                await db.run('INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu, classe_cible, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [nom, auteur_id, desc, date_c, docs, date_r, classe, 'validee']);
            }
            res.json({ message: `✅ ${limit} SAEs générées !` });
        }
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur lors de la génération." }); }
});

app.get('/api/admin/users', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    try {
        const users = await db.all('SELECT id, nom, prenom, mail, role, classe FROM Comptes ORDER BY id DESC');
        res.json(users);
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur." }); }
});

app.post('/api/admin/impersonate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    const { userId } = req.body;
    try {
        const user = await db.get('SELECT * FROM Comptes WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ message: "Introuvable." });
        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role, classe: user.classe }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom, classe: user.classe });
    } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur." }); }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});