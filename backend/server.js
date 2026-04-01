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
initDB();

app.get('/api/public/sae', async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT SAE.*, Comptes.nom AS auteur_nom, Comptes.prenom AS auteur_prenom 
            FROM SAE JOIN Comptes ON SAE.auteur_id = Comptes.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post('/api/register', async (req, res) => {
    const { nom, prenom, mail, password, role, classe } = req.body;
    try {
        const existingUsers = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) return res.status(400).json({ message: "Cet email est déjà utilisé" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const classeUser = classe || (role === 'enseignant' ? '[]' : 'MMI-A1');

        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)',
            [nom, prenom, mail, hashedPassword, role || 'etudiant', classeUser]
        );
        res.status(201).json({ message: "Compte créé avec succès !" });
    } catch (error) {
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
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

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

app.get('/api/sae', verifierToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const rows = await db.all('SELECT * FROM SAE');
            return res.json(rows);
        } else if (req.user.role === 'enseignant') {
            const rows = await db.all('SELECT * FROM SAE WHERE auteur_id = ?', [req.user.id]);
            return res.json(rows);
        } else {
            const userDb = await db.get('SELECT classe FROM Comptes WHERE id = ?', [req.user.id]);
            const rows = await db.all(`
                SELECT SAE.*, Rendus.id AS rendu_id, Rendus.date_soumission 
                FROM SAE 
                LEFT JOIN Rendus ON SAE.id = Rendus.sae_id AND Rendus.etudiant_id = ?
                WHERE SAE.classe_cible = ? OR SAE.classe_cible = 'Toutes'
            `, [req.user.id, userDb.classe]);
            return res.json(rows);
        }
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post('/api/sae', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Non autorisé." });

    const { nom, description, date_rendu, classe_cible } = req.body;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 
    const fichiersNoms = req.files ? req.files.map(f => f.filename) : [];
    const documentsStr = JSON.stringify(fichiersNoms); 

    try {
        await db.run(
            'INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu, classe_cible) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nom, auteur_id, description, date_creation, documentsStr, date_rendu, classe_cible || 'Toutes']
        );
        res.status(201).json({ message: "SAE créée avec succès !" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.put('/api/sae/:id', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Non autorisé." });
    const saeId = req.params.id;
    const { nom, description, date_rendu, classe_cible } = req.body;

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

        await db.run(
            'UPDATE SAE SET nom = ?, description = ?, date_rendu = ?, classe_cible = ?, documents = ? WHERE id = ?',
            [nom, description, date_rendu, classe_cible || 'Toutes', documentsStr, saeId]
        );
        res.json({ message: "SAE modifiée avec succès !" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la modification" });
    }
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
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
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
    } catch (error) {
        res.status(500).json({ message: "Erreur lors du rendu" });
    }
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
                await db.run('INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu, classe_cible) VALUES (?, ?, ?, ?, ?, ?, ?)', [nom, auteur_id, desc, date_c, docs, date_r, classe]);
            }
            res.json({ message: `✅ ${limit} SAEs générées !` });
        }
    } catch (error) { res.status(500).json({ message: "Erreur lors de la génération." }); }
});

app.get('/api/admin/users', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    try {
        const users = await db.all('SELECT id, nom, prenom, mail, role, classe FROM Comptes ORDER BY id DESC');
        res.json(users);
    } catch (error) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post('/api/admin/impersonate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé." });
    const { userId } = req.body;
    try {
        const user = await db.get('SELECT * FROM Comptes WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ message: "Introuvable." });
        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role, classe: user.classe }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom, classe: user.classe });
    } catch (error) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.get('/api/users/me', verifierToken, async (req, res) => {
    try {
        const user = await db.get('SELECT nom, prenom, mail, role, classe FROM Comptes WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: "Compte introuvable" });
        res.json(user);
    } catch (error) { res.status(500).json({ message: "Erreur serveur" }); }
});

app.put('/api/users/me', verifierToken, async (req, res) => {
    const { nom, prenom, mail, classe } = req.body;
    try {
        const existing = await db.get('SELECT id FROM Comptes WHERE mail = ? AND id != ?', [mail, req.user.id]);
        if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé." });
        await db.run('UPDATE Comptes SET nom = ?, prenom = ?, mail = ?, classe = ? WHERE id = ?', [nom, prenom, mail, classe, req.user.id]);
        const token = jwt.sign({ id: req.user.id, mail: mail, role: req.user.role, classe: classe }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, nom, prenom, classe, message: "Profil mis à jour !" });
    } catch (error) { res.status(500).json({ message: "Erreur lors de la mise à jour." }); }
});

// --- NOUVELLES ROUTES : GESTION DES CLASSES PAR L'ENSEIGNANT ---

// 1. Récupérer la liste de TOUS les étudiants (pour que le prof puisse les ajouter)
app.get('/api/enseignant/etudiants', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Refusé" });
    try {
        const etudiants = await db.all("SELECT id, nom, prenom, mail, classe FROM Comptes WHERE role = 'etudiant' ORDER BY nom ASC");
        res.json(etudiants);
    } catch (error) { res.status(500).json({ message: "Erreur serveur" }); }
});

// 2. Assigner un élève à une classe
app.put('/api/enseignant/etudiants/:id/classe', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') return res.status(403).json({ message: "Refusé" });
    const { nouvelleClasse } = req.body;
    try {
        await db.run("UPDATE Comptes SET classe = ? WHERE id = ? AND role = 'etudiant'", [nouvelleClasse, req.params.id]);
        res.json({ message: "Classe de l'élève mise à jour" });
    } catch (error) { res.status(500).json({ message: "Erreur" }); }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});