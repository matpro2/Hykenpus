const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors()); // Autorise le Front-end à nous parler
app.use(express.json()); // Permet de lire le JSON dans le corps des requêtes

// Données fictives pour commencer
const saeList = [
  { id: 1, titre: "SAE 3.01", description: "Conception d'un service", semestre: "S3", etat: "rendue" },
  { id: 2, titre: "SAE 4.01", description: "Plateforme interne", semestre: "S4", etat: "en cours" }
];

// Notre premier Endpoint (Point de terminaison)
app.get('/api/sae', (req, res) => {
  res.json(saeList);
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur Back-end démarré sur http://localhost:${PORT}`);
});