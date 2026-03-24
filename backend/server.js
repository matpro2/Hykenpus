// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); // Le moteur local
const { open } = require('sqlite'); // Pour utiliser async/await avec SQLite

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

let db; // Notre connexion à la base de données locale

// --- INITIALISATION DE LA BASE DE DONNÉES LOCALE ---
async function initDB() {
    // 1. On crée ou on ouvre le fichier local
    db = await open({
        filename: './mmi_hub.sqlite', 
        driver: sqlite3.Database
    });

    // 2. On crée les tables automatiquement si elles n'existent pas !
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
    console.log("✅ Base de données locale (SQLite) prête et opérationnelle !");
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

app.post('/api/sae', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant') {
        return res.status(403).json({ message: "Seuls les enseignants peuvent créer une SAE." });
    }

    const { nom, description, documents } = req.body;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 

    try {
        await db.run(
            'INSERT INTO SAE (nom, auteur_id, description, date_creation, documents) VALUES (?, ?, ?, ?, ?)',
            [nom, auteur_id, description, date_creation, documents || '']
        );
        res.status(201).json({ message: "SAE créée avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la création de la SAE" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}, en mode BASE DE DONNÉES LOCALE !`);
});