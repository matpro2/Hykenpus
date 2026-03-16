// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8000;
const SECRET_KEY = "ma_cle_secrete_pour_la_sae"; 

app.use(cors());
app.use(express.json());

// Données enrichies avec images, années et travaux pour le mode public
const saeList = [
  { id: 1, titre: "SAE 3.01", description: "Conception d'un service", semestre: "S3", etat: "rendue", annee: 2025, image: "https://picsum.photos/seed/sae1/600/300", travaux: "Maquette interactive Figma" },
  { id: 2, titre: "SAE 4.01", description: "Plateforme interne", semestre: "S4", etat: "en cours", annee: 2026, image: "https://picsum.photos/seed/sae2/600/300", travaux: "Code source React & Node.js" },
  { id: 3, titre: "SAE 1.01", description: "Site web statique", semestre: "S1", etat: "rendue", annee: 2025, image: "https://picsum.photos/seed/sae3/600/300", travaux: "Portfolio HTML/CSS" }
];

// NOUVEAU : Endpoint public (SANS vérification de token)
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