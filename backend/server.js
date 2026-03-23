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
    host: 'localhost',     // Ou l'adresse de ton serveur MySQL
    user: 'root',          // Utilisateur par défaut
    password: '',          // Mot de passe par défaut (souvent vide sous XAMPP)
    database: 'mmi_hub'    // LE NOM DE TA BASE DE DONNÉES
};

// --- ROUTES PUBLIQUES ---

// 1. Endpoint public (Galerie SAE) - Lit depuis la BDD
app.get('/api/public/sae', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // On récupère les SAE avec le nom et prénom de l'auteur grâce à une jointure (JOIN)
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
        
        // On vérifie si l'email existe déjà
        const [existingUsers] = await connection.execute('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }

        // On crypte le mot de passe avant de le sauvegarder
        const hashedPassword = await bcrypt.hash(password, 10);

        // On insère le nouvel utilisateur
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
    const { mail, password } = req.body; // On utilise le mail maintenant

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // On cherche l'utilisateur par son mail
        const [users] = await connection.execute('SELECT * FROM Comptes WHERE mail = ?', [mail]);
        await connection.end();

        if (users.length === 0) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        const user = users[0];

        // On compare le mot de passe tapé avec le mot de passe crypté en base
        const isValidPassword = await bcrypt.compare(password, user.mot_de_passe);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        // Si tout est bon, on génère le Token !
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

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}, prêt à parler avec MySQL !`);
});