import { useState, useEffect } from 'react';
import { saeService } from './services/saeServices';
import './App.css'; // On garde le CSS par défaut pour l'instant

function App() {
  const [saes, setSaes] = useState([]);
  const [erreur, setErreur] = useState(null);

  // useEffect permet d'exécuter le fetch au chargement de la page
  useEffect(() => {
    const chargerSae = async () => {
      try {
        const donnees = await saeService.getListeSae();
        setSaes(donnees);
      } catch (err) {
        setErreur("Impossible de charger les SAE : " + err.message);
      }
    };

    chargerSae();
  }, []);

  return (
    <div className="dashboard-container">
      <h1>Plateforme de suivi des SAE</h1>
      <h2>Vue Étudiant : Tableau de bord</h2>

      {erreur && <p style={{ color: 'red' }}>{erreur}</p>}

      <div className="sae-list">
        {saes.length === 0 && !erreur ? (
          <p>Chargement des SAE...</p>
        ) : (
          saes.map((sae) => (
            <div key={sae.id} className="sae-card">
              <h3>{sae.titre}</h3>
              <p><strong>Description:</strong> {sae.description}</p>
              <p><strong>Semestre:</strong> {sae.semestre}</p>
              <p><strong>État:</strong> {sae.etat}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
