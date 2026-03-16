// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// IMPORTATION DES DONNÉES DEPUIS LE FICHIER EXTERNE
const saeList = require('./data/saes.json');

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

// Endpoint public (SANS vérification de token)
app.get('/api/public/sae', (req, res) => {
  res.json(saeList);
});

// Endpoint d'authentification (Login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === "etudiant" && password === "mmi2026") {
    const token = jwt.sign({ username, role: "etudiant" }, SECRET_KEY, { expiresIn: '2h' });
    return res.json({ token: token, role: "etudiant" });
  } 
  else if (username === "enseignant" && password === "prof2026") {
    const token = jwt.sign({ username, role: "enseignant" }, SECRET_KEY, { expiresIn: '2h' });
    return res.json({ token: token, role: "enseignant" });
  } 
  
  res.status(401).json({ message: "Identifiants incorrects" });
});

// Middleware pour vérifier le Token sur les routes protégées
const verifierToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Accès refusé, token manquant" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalide" });
    req.user = user;
    next(); 
  });
};

// Endpoint protégé (Liste des SAE pour le tableau de bord)
app.get('/api/sae', verifierToken, (req, res) => {
  res.json(saeList);
});

app.listen(PORT, () => {
  console.log(`Serveur Back-end démarré sur http://localhost:${PORT}`);
});