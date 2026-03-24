// backend/test-db.js
const mysql = require('mysql2/promise');

// Les identifiants validés par ton test PHP
const dbConfig = {
    host: 'servd162214.srv.odns.fr', 
    user: 'mathieuprosper_Admin1',
    password: 'CH?dgNItbm*q',
    database: 'mathieuprosper_Hykenpus',
    connectTimeout: 10000 // On met un délai de 10 secondes pour ne pas attendre dans le vide
};

async function testerBaseDeDonnees() {
    console.log("===========================================");
    console.log("🕵️ DÉBUT DU TEST DE CONNEXION O2SWITCH");
    console.log("===========================================\n");

    console.log(`⏳ 1. Tentative de connexion au serveur : ${dbConfig.host}...`);
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("✅ 2. Connexion réussie à MySQL avec les bons identifiants !");

        console.log("⏳ 3. Test de lecture de la table SAE...");
        const [rows] = await connection.execute('SELECT * FROM SAE');
        
        console.log("✅ 4. Lecture réussie ! Voici ce qu'il y a dans la base :");
        console.log(rows);

        await connection.end();
        console.log("\n👋 5. Test terminé avec succès. Le lien entre Codespaces et o2switch est parfait !");

    } catch (error) {
        console.log("\n❌ ERREUR DÉTECTÉE !");
        console.log("-------------------------------------------");
        console.log("Code de l'erreur :", error.code);
        console.log("Message exact :", error.message);
        console.log("-------------------------------------------");
        
        if (error.code === 'ETIMEDOUT') {
            console.log("💡 DIAGNOSTIC : Le pare-feu d'o2switch bloque l'adresse IP de ton Codespaces. La requête n'arrive même pas jusqu'au mot de passe.");
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log("💡 DIAGNOSTIC : L'adresse IP est acceptée, mais le vigile MySQL refuse l'utilisateur ou le mot de passe.");
        } else if (error.code === 'ENOTFOUND') {
            console.log("💡 DIAGNOSTIC : L'adresse du serveur (host) est introuvable. Vérifie le servd162214.srv.odns.fr.");
        }
    }
}

testerBaseDeDonnees();