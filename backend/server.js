// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Import de la librairie JWT

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; // Clé pour signer le token

app.use(cors());
app.use(express.json());

// Données fictives autorisées par le cahier des charges
const saeList = [
  { id: 1, titre: "SAE 3.01", description: "Conception d'un service", semestre: "S3", etat: "rendue" },
  { id: 2, titre: "SAE 4.01", description: "Plateforme interne", semestre: "S4", etat: "en cours" }
];

// 1. Endpoint d'authentification (Login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Vérification avec des identifiants fictifs (autorisé par le sujet)
  if (username === "etudiant" && password === "mmi2026") {
    // Génération du JWT signé
    const token = jwt.sign({ username: username, role: "etudiant" }, SECRET_KEY, { expiresIn: '2h' });
    res.json({ token: token });
  } else {
    res.status(401).json({ message: "Identifiants incorrects" });
  }
});

// 2. Middleware pour vérifier le Token sur les routes protégées
const verifierToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // On récupère le token après le mot "Bearer "
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Accès refusé, token manquant" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalide" });
    req.user = user;
    next(); // Le token est bon, on passe à la suite
  });
};

// 3. Endpoint protégé (Liste des SAE)
app.get('/api/sae', verifierToken, (req, res) => {
  res.json(saeList);
});

app.listen(PORT, () => {
  console.log(`Serveur Back-end démarré sur http://localhost:${PORT}`);
});