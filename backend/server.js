// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise'); // Librairie MySQL

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

// --- CONFIGURATION DE LA BASE DE DONNÉES ---
const dbConfig = {
    host: 'servd162214.srv.odns.fr',
    user: 'mathieuprosper_Admin',
    password: '+p4Y]6.Z(LzS',
    database: 'mathieuprosper_Hykenpus'
};

// --- ROUTES PUBLIQUES ---

// 1. Endpoint public (Galerie SAE) - Lit depuis la BDD
app.get('/api/public/sae', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT SAE.*, Comptes.nom AS auteur_nom, Comptes.prenom AS auteur_prenom 
            FROM SAE 
            JOIN Comptes ON SAE.auteur_id = Comptes.id
        `);
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des données" });
    }
});

// --- AUTHENTIFICATION ---

// 2. Inscription (Register)
app.post('/api/register', async (req, res) => {
    const { nom, prenom, mail, password, role } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [existingUsers] = await connection.execute('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.execute(
            'INSERT INTO Comptes (nom, prenom, mail, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
            [nom, prenom, mail, hashedPassword, role || 'etudiant']
        );
        
        await connection.end();
        res.status(201).json({ message: "Compte créé avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});

// 3. Connexion (Login)
app.post('/api/login', async (req, res) => {
    const { mail, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [users] = await connection.execute('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        await connection.end();

        if (users.length === 0) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        const user = users[0];

        const isValidPassword = await bcrypt.compare(password, user.mot_de_passe);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        const token = jwt.sign({ id: user.id, mail: user.mail, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
        
        res.json({ 
            token: token, 
            role: user.role, 
            nom: user.nom, 
            prenom: user.prenom 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

// --- ROUTES PROTÉGÉES ---

// Middleware de vérification
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

// 4. Liste des SAE pour le tableau de bord
app.get('/api/sae', verifierToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM SAE');
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// 5. NOUVEAU : Création d'une nouvelle SAE (Réservé aux enseignants)
app.post('/api/sae', verifierToken, async (req, res) => {
    if (req.user.role !== 'enseignant') {
        return res.status(403).json({ message: "Seuls les enseignants peuvent créer une SAE." });
    }

    const { nom, description, documents } = req.body;
    const auteur_id = req.user.id; 
    const date_creation = new Date().toISOString().split('T')[0]; 

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO SAE (nom, auteur_id, description, date_creation, documents) VALUES (?, ?, ?, ?, ?)',
            [nom, auteur_id, description, date_creation, documents || '']
        );
        await connection.end();
        res.status(201).json({ message: "SAE créée avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la création de la SAE" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}, prêt à parler avec MySQL !`);
});