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
            classe TEXT -- NOUVEAU : La classe de l'étudiant
        );
        
        CREATE TABLE IF NOT EXISTS SAE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            auteur_id INTEGER NOT NULL,
            description TEXT,
            date_creation TEXT,
            documents TEXT,
            date_rendu TEXT,
            classe_cible TEXT, -- NOUVEAU : À quelle classe s'adresse cette SAE ?
            FOREIGN KEY (auteur_id) REFERENCES Comptes(id) ON DELETE CASCADE
        );
    `);

    const adminExists = await db.get('SELECT * FROM Comptes WHERE mail = ?', ['Admin']);
    if (!adminExists) {
        const hashedAdminPw = await bcrypt.hash('Admin', 10);
        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)',
            ['Système', 'Admin', 'Admin', hashedAdminPw, 'admin', 'Toutes']
        );
    }
    console.log("✅ Base de données locale prête (Avec système de Classes) !");
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
    // On récupère la classe envoyée par le formulaire
    const { nom, prenom, mail, password, role, classe } = req.body;
    try {
        const existingUsers = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) return res.status(400).json({ message: "Cet email est déjà utilisé" });

        const hashedPassword = await bcrypt.hash(password, 10);
        // Si c'est un enseignant, sa classe par défaut est 'Toutes'
        const classeUser = role === 'enseignant' ? 'Toutes' : (classe || 'MMI-A1');

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

// NOUVEAU : LE FILTRE INTELLIGENT PAR RÔLE ET CLASSE
app.get('/api/sae', verifierToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // L'admin voit absolument TOUT
            const rows = await db.all('SELECT * FROM SAE');
            return res.json(rows);
        } else if (req.user.role === 'enseignant') {
            // L'enseignant voit uniquement les SAEs qu'IL a publiées
            const rows = await db.all('SELECT * FROM SAE WHERE auteur_id = ?', [req.user.id]);
            return res.json(rows);
        } else {
            // L'étudiant voit les SAEs destinées à SA classe OU à 'Toutes'
            // On re-cherche sa classe exacte en BDD par sécurité
            const userDb = await db.get('SELECT classe FROM Comptes WHERE id = ?', [req.user.id]);
            const rows = await db.all('SELECT * FROM SAE WHERE classe_cible = ? OR classe_cible = ?', [userDb.classe, 'Toutes']);
            return res.json(rows);
        }
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post('/api/sae', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Non autorisé à créer une SAE." });
    }

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
        res.status(500).json({ message: "Erreur lors de la création de la SAE" });
    }
});

// ROUTE DE GÉNÉRATION ADMIN
app.post('/api/admin/generate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé. Réservé à l'Admin." });
    
    const { type, count } = req.body;
    const limit = parseInt(count) || 5;
    const classesList = ['MMI-A1', 'MMI-A2', 'MMI-B1', 'MMI-B2', 'Toutes'];

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
                const classe = role === 'enseignant' ? 'Toutes' : classesList[Math.floor(Math.random() * 4)]; // 4 premières
                
                await db.run('INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role, classe) VALUES (?, ?, ?, ?, ?, ?)', [n, p, mail, pwd, role, classe]);
            }
            res.json({ message: `✅ ${limit} comptes générés avec succès ! (Mdp: password123)` });
        
        } else if (type === 'saes') {
            const profs = await db.all('SELECT id FROM Comptes WHERE role = "enseignant"');
            if(profs.length === 0) return res.status(400).json({ message: "❌ Il faut au moins un compte 'Enseignant'." });

            const sujets = ['Création site web', 'Design UI/UX', 'Montage vidéo', 'Stratégie Com', 'Base de données', 'React'];
            
            for(let i=0; i<limit; i++) {
                const nom = `SAE 3.0${Math.floor(Math.random() * 9) + 1} - ${sujets[Math.floor(Math.random() * sujets.length)]}`;
                const auteur_id = profs[Math.floor(Math.random() * profs.length)].id;
                const desc = "Ceci est une description générée automatiquement.";
                const date_c = new Date().toISOString().split('T')[0];
                
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 60) + 1); 
                futureDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60)); 
                const date_r = futureDate.toISOString().slice(0, 16); 
                const docs = "[]";
                const classe = classesList[Math.floor(Math.random() * classesList.length)];

                await db.run('INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu, classe_cible) VALUES (?, ?, ?, ?, ?, ?, ?)', [nom, auteur_id, desc, date_c, docs, date_r, classe]);
            }
            res.json({ message: `✅ ${limit} SAEs générées !` });
        } else {
            res.status(400).json({ message: "Type inconnu." });
        }
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la génération." });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});