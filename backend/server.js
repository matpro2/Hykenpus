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

// --- INITIALISATION DE LA BASE DE DONNÉES LOCALE ---
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
            role TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS SAE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            auteur_id INTEGER NOT NULL,
            description TEXT,
            date_creation TEXT,
            documents TEXT,
            date_rendu TEXT,
            FOREIGN KEY (auteur_id) REFERENCES Comptes(id) ON DELETE CASCADE
        );
    `);

    // NOUVEAU : CRÉATION AUTOMATIQUE DU COMPTE ADMIN
    const adminExists = await db.get('SELECT * FROM Comptes WHERE mail = ?', ['Admin']);
    if (!adminExists) {
        const hashedAdminPw = await bcrypt.hash('Admin', 10);
        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
            ['Système', 'Admin', 'Admin', hashedAdminPw, 'admin']
        );
        console.log("👑 Compte Admin créé (Identifiant: Admin / Mot de passe: Admin)");
    }

    console.log("✅ Base de données locale et système de fichiers prêts !");
}
initDB();

// --- ROUTES PUBLIQUES ---
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

// --- AUTHENTIFICATION ---
app.post('/api/register', async (req, res) => {
    const { nom, prenom, mail, password, role } = req.body;
    try {
        const existingUsers = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) return res.status(400).json({ message: "Cet email est déjà utilisé" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
            [nom, prenom, mail, hashedPassword, role || 'etudiant']
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

        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

// --- ROUTES PROTÉGÉES ---
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
        const rows = await db.all('SELECT * FROM SAE');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post('/api/sae', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Non autorisé à créer une SAE." });
    }

    const { nom, description, date_rendu } = req.body;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 

    const fichiersNoms = req.files ? req.files.map(f => f.filename) : [];
    const documentsStr = JSON.stringify(fichiersNoms); 

    try {
        await db.run(
            'INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu) VALUES (?, ?, ?, ?, ?, ?)',
            [nom, auteur_id, description, date_creation, documentsStr, date_rendu]
        );
        res.status(201).json({ message: "SAE créée avec succès !" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création de la SAE" });
    }
});

// NOUVEAU : ROUTE SPÉCIALE GÉNÉRATION POUR L'ADMIN
app.post('/api/admin/generate', verifierToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Accès refusé. Réservé à l'Admin." });
    
    const { type, count } = req.body;
    const limit = parseInt(count) || 5;

    try {
        if (type === 'users') {
            const prenoms = ['Lukas', 'Emma', 'Thomas', 'Chloe', 'Hugo', 'Lea', 'Maxime', 'Manon', 'Antoine', 'Camille'];
            const noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];
            
            for(let i=0; i<limit; i++) {
                const p = prenoms[Math.floor(Math.random() * prenoms.length)];
                const n = noms[Math.floor(Math.random() * noms.length)];
                const role = Math.random() > 0.8 ? 'enseignant' : 'etudiant'; // 20% de profs, 80% d'étudiants
                const mail = `${p.toLowerCase()}.${n.toLowerCase()}${Math.floor(Math.random()*1000)}@test.fr`;
                const pwd = await bcrypt.hash('password123', 10);
                
                await db.run('INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)', [n, p, mail, pwd, role]);
            }
            res.json({ message: `✅ ${limit} comptes générés avec succès ! (Leur mot de passe à tous est : password123)` });
        
        } else if (type === 'saes') {
            const profs = await db.all('SELECT id FROM Comptes WHERE role = "enseignant"');
            if(profs.length === 0) return res.status(400).json({ message: "❌ Il faut au moins un compte 'Enseignant' pour pouvoir générer des SAEs." });

            const sujets = ['Création site web', 'Design UI/UX', 'Montage vidéo', 'Stratégie Com', 'Base de données', 'Développement React', 'Animation 3D', 'Infographie'];
            
            for(let i=0; i<limit; i++) {
                const nom = `SAE ${Math.floor(Math.random() * 6) + 1}.0${Math.floor(Math.random() * 9) + 1} - ${sujets[Math.floor(Math.random() * sujets.length)]}`;
                const auteur_id = profs[Math.floor(Math.random() * profs.length)].id;
                const desc = "Ceci est une description générée automatiquement par le système Admin pour remplir le site et tester l'interface. Les étudiants devront réaliser ce projet avec soin.";
                const date_c = new Date().toISOString().split('T')[0];
                
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 60) + 7); // Entre +7 et +67 jours
                const date_r = futureDate.toISOString().split('T')[0];
                const docs = "[]";

                await db.run('INSERT INTO SAE (nom, auteur_id, description, date_creation, documents, date_rendu) VALUES (?, ?, ?, ?, ?, ?)', [nom, auteur_id, desc, date_c, docs, date_r]);
            }
            res.json({ message: `✅ ${limit} SAEs générées de manière aléatoire !` });
        } else {
            res.status(400).json({ message: "Type inconnu." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la génération." });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});