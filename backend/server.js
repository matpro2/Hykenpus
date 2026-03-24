// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); 
const { open } = require('sqlite'); 
const multer = require('multer'); // NOUVEAU : Pour les fichiers
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

// --- CONFIGURATION DE MULTER (Upload de fichiers) ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // Crée le dossier s'il n'existe pas
}
app.use('/uploads', express.static(uploadDir)); // Rend le dossier public

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
            FOREIGN KEY (auteur_id) REFERENCES Comptes(id) ON DELETE CASCADE
        );
    `);
    console.log("✅ Base de données locale et système de fichiers prêts !");
}
initDB();

// --- ROUTES PUBLIQUES ---

app.get('/api/public/sae', async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT SAE.*, Comptes.nom AS auteur_nom, Comptes.prenom AS auteur_prenom 
            FROM SAE 
            JOIN Comptes ON SAE.auteur_id = Comptes.id
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// --- AUTHENTIFICATION ---

app.post('/api/register', async (req, res) => {
    const { nom, prenom, mail, password, role } = req.body;
    try {
        const existingUsers = await db.all('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
            [nom, prenom, mail, hashedPassword, role || 'etudiant']
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
        if (users.length === 0) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.mot_de_passe);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.role, nom: user.nom, prenom: user.prenom });
    } catch (error) {
        console.error(error);
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

// NOUVEAU : On utilise upload.array('fichiers') pour intercepter les documents
app.post('/api/sae', verifierToken, upload.array('fichiers', 10), async (req, res) => {
    if (req.user.role !== 'enseignant') {
        return res.status(403).json({ message: "Seuls les enseignants peuvent créer une SAE." });
    }

    const { nom, description } = req.body;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 

    // On crée une liste des noms de fichiers sauvegardés
    const fichiersNoms = req.files ? req.files.map(f => f.filename) : [];
    const documentsStr = JSON.stringify(fichiersNoms); 

    try {
        await db.run(
            'INSERT INTO SAE (nom, auteur_id, description, date_creation, documents) VALUES (?, ?, ?, ?, ?)',
            [nom, auteur_id, description, date_creation, documentsStr]
        );
        res.status(201).json({ message: "SAE créée avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la création de la SAE" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});