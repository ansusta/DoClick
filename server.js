const express = require('express');
const path = require('path');
const cors = require("cors");
const db = require("./db");
const validator = require('validator');
const bcrypt = require("bcrypt");
const multer = require("multer");
const https = require('https');
const fs = require('fs');
const jwt = require("jsonwebtoken");
const SECRET_KEY = "ABC";
const app = express();
const { startSchedulers } = require('./scheduler');
const { verifyToken } = require("./middleware"); 
const { generateWeeklyDisponibilities } = require('./disponibiliteGenerator');


const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage });
const { body, validationResult } = require('express-validator');
app.use(cors());
app.use(express.json());
app.use('/css', express.static(path.join(__dirname, 'front/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'front/node_modules/bootstrap/dist/js')));
app.use('/jquery', express.static(path.join(__dirname, 'front/node_modules/jquery/dist')));
app.use('/popper', express.static(path.join(__dirname, 'front/node_modules/@popperjs/core/dist/umd')));
app.use('/icon', express.static(path.join(__dirname, 'front/node_modules/@fortawesome/fontawesome-free/css')));
app.use('/webfonts', express.static(path.join(__dirname, 'front/node_modules/@fortawesome/fontawesome-free/webfonts')));
app.use('/rs', express.static(path.join(__dirname, 'front/resources')));
app.use('/uploads', express.static(path.join(__dirname, 'front/www/uploads')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/capacitor/core', express.static(path.join(__dirname, 'front/node_modules/@capacitor/core/dist')));
app.use('/capacitor/storage', express.static(path.join(__dirname, 'front/node_modules/@capacitor/preferences/dist')));
app.use(express.static(path.join(__dirname, 'front/www')));
startSchedulers();

//signup
app.post("/api/signup", [ 
    body('credential') 
        .trim()
        .notEmpty()
        .withMessage('mail ou numero du telephone est requis'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('mot de pass doit etre au moins 6 lettres')
        .matches(/\d/)
        .withMessage('mot de pass doit contenir ou moins un chiffre '),
    body('username')
        .trim()
        .notEmpty()
        .withMessage('nom d utilisateur est requis')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { credential, password, username, birthdate } = req.body;

    if (!birthdate || isNaN(Date.parse(birthdate))) {
        return res.status(400).json({ error: "Une date de naissance valide est requise" });
    }
    
    const birth = new Date(birthdate);
let age = new Date().getFullYear() - birth.getFullYear();
const m = new Date().getMonth() - birth.getMonth();
if (m < 0 || (m === 0 && new Date().getDate() < birth.getDate())) {
    age--;
}

    if (age < 18) {
        return res.status(400).json({ error: "Vous devez avoir au moins 18 ans pour vous inscrire" });
    }
        if (age > 120) {
        return res.status(400).json({ error: "veuillez saisir une date de naissance valide" });
    }
    
    try {
        const isEmail = validator.isEmail(credential);
        const isPhone = validator.isMobilePhone(credential, 'any', { strictMode: false });
        
        if (!isEmail && !isPhone) {
            return res.status(400).json({ error: "Veuillez fournir une adresse e-mail ou un numéro de téléphone valide" });
        }
        const [existingUsers] = await db.promise().query(
            "SELECT idUtilisateur FROM utilisateur WHERE email = ? OR numTel = ? OR nom = ?", 
            [isEmail ? credential : null, isPhone ? credential : null, username]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "E-mail, numéro de téléphone ou nom d'utilisateur déjà utilisé" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.promise().query(
            isEmail
                ? "INSERT INTO utilisateur (email, nom, motPass, type, picture) VALUES (?, ?, ?, 'patient','/rs/user.jpg')"
                : "INSERT INTO utilisateur (numTel, nom, motPass, type, picture) VALUES (?, ?, ?, 'patient','/rs/user.jpg')",
            [credential, username, hashedPassword]
        );
        
        const idUtilisateur = result.insertId;
        
        await db.promise().query(
            "INSERT INTO patient (idUtilisateur, DateNais) VALUES (?, ?)",
            [idUtilisateur, birthdate]
        );
        
        res.status(201).json({ message: "Utilisateur créé avec succès" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

//authentification
app.get("/api/protected", verifyToken, (req, res) => {
    console.log("Accessing protected route...");
    console.log("User from token:", req.user);
    res.json({ message: "itinéraire protégé", user: req.user });
});

//login
app.post('/api/login', async (req, res) => {
    console.log("Received login request body:", req.body);
    const { credential, password } = req.body;
    console.log("Parsed credential:", credential);
    console.log("Parsed password:", password);

    if (!credential || !password) {
        console.log("Missing credential or password");
        return res.status(400).json({ error: "E-mail, numéro de téléphone ou mot de passe manquant" });
    }

    try {
        let query, param;
        if (validator.isEmail(credential)) {
            console.log("Credential is an email");
            query = "SELECT idUtilisateur AS id, email, picture, type, motPass, status FROM utilisateur WHERE email = ?";
            param = [credential];
        } else if (validator.isMobilePhone(credential, 'any', { strictMode: false })) {
            console.log("Credential is a phone number");
            query = "SELECT idUtilisateur AS id, numTel AS email, picture, type, motPass, status FROM utilisateur WHERE numTel = ?";
            param = [credential];
        } else {
            console.log("Invalid credential type");
            return res.status(400).json({ error: "Adresse e-mail ou numéro de téléphone invalide" });
        }

        console.log("Executing query:", query, param);
        const [results] = await db.promise().query(query, param);
        console.log("Query results:", results);

        if (results.length === 0) {
            console.log("Account not found");
            return res.status(401).json({ error: "Compte non trouvé" });
        }

        const user = results[0];
        console.log("User data:", user);

        if (user.status && user.status.toLowerCase() === 'banned') {
            console.log("Banned user attempted to login");
            return res.status(403).json({ error: "Votre compte est suspendu. Veuillez contacter l'administration." });
        }

        const isMatch = await bcrypt.compare(password, user.motPass);
        console.log("Password match result:", isMatch);

        if (!isMatch) {
            console.log("Wrong password");
            return res.status(401).json({ error: "Mot de passe incorrect" });
        }

        const tokenData = { id: user.id, email: user.email, role: user.type };
        console.log("Token data:", tokenData);
        const token = jwt.sign(tokenData, SECRET_KEY, { expiresIn: "2h" });
        console.log("Generated token:", token);

        res.json({ 
            message: "Connexion réussie", 
            token 
        });

    } catch (error) {
        console.error("Database error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});


//get all doctors

app.get("/api/doctors", async (req, res) => {
    console.log("Received GET request on /api/doctors");
    try {
        const query = "SELECT * FROM medecin ORDER BY nom ASC";
        console.log("Executing query:", query);
        if (!db || !db.promise) {
            console.error("Database connection or promise wrapper is undefined!");
        }
        const [doctors] = await db.promise().query(query);

        console.log("Query successful. Number of doctors fetched:", doctors.length);
        if (doctors.length > 0) {
            console.log("First doctor fetched:", doctors[0]);
        }
        res.json({ doctors });
    } catch (error) {
        console.error("Error fetching doctors:", error.message);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});



//add doctor

app.post("/api/doctors", async (req, res) => {
    try {
        const { nom, specialite, numTel, diplome } = req.body;
        if (!nom || !specialite || !numTel|| !diplome) {
            return res.status(400).json({ error: "Tous les champs sont obligatoires : nom, spécialité, numtel, diplome" });
        }
        const [result] = await db.promise().query(
            "INSERT INTO medecin (nom, specialite, numTel, diplome) VALUES (?, ?, ?, ?)",
            [nom, specialite, numTel, diplome]
        );
        res.status(201).json({ 
            message: "Doctor added successfully", 
            doctorId: result.insertId 
        });
    } catch (error) {
        console.error("Error adding doctor:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});


// get all reservations
app.get("/api/reservations", async (req, res) => {
    try {
      const query = `
        SELECT 
    DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
    TIME_FORMAT(r.heure, '%H:%i') AS heure,
    r.status,
    m.nom AS medecin,
    u.nom AS user,
    m.specialite
  FROM rendezvous r
  JOIN medecin m ON r.idMedecin = m.idMedecin
  JOIN utilisateur u ON r.idUtilisateur = u.idUtilisateur
  WHERE r.status = 'ongoing'
      `;
      const [reservations] = await db.promise().query(query);
      res.json({ reservations });
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  });

  //get patient history
  
app.get("/api/historique",async(req , res)=>{
    try{
        const query=`
       SELECT 
    DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
    TIME_FORMAT(r.heure, '%H:%i') AS heure,
    r.status,
    m.nom AS medecin,
    u.nom AS user
FROM rendezvous r
JOIN medecin m ON r.idMedecin = m.idMedecin
JOIN utilisateur u ON r.idUtilisateur = u.idUtilisateur
WHERE r.status IN ('completed', 'cancelled')
      `;
        const[reservations]=await db.promise().query(query);
        res.json( {reservations});
    }catch(error){
        console.error("error fetching reservations :",error);
        res.status(500).json({error:"Erreur interne du serveur"})
    }

})

//get a specific user reservatoin
app.get('/api/reservations/:id', async (req, res) => {
    const userId = req.params.id;
    const query = `
        SELECT 
            r.idRendezVous,
            r.status,
            DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
            TIME_FORMAT(r.heure, '%H:%i') AS heure,
            m.specialite AS specialite,
            m.nom AS medecin
        FROM rendezvous r
        JOIN medecin m ON r.idMedecin = m.idMedecin
        WHERE r.idUtilisateur = ? AND r.status = 'ongoing';
    `;
    try {
        const [reservations] = await db.promise().query(query, [userId]);
        if (reservations.length === 0) {
            console.log(" No records found, sending empty array");
            return res.json([]);
        }
        res.json(reservations);
    } catch (err) {
        console.error("Database Error:", err.sqlMessage || err);
        res.status(500).json({ error: "Erreur interne du serveur", details: err.sqlMessage });
    }
});

//get a specific user history
app.get('/api/historique/:id', async (req, res) => {
    const userId = req.params.id;
    const query = `
        SELECT 
            DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
            TIME_FORMAT(r.heure, '%H:%i') AS heure,
            m.specialite AS specialite,
            m.nom AS medecin,
            r.status
        FROM rendezvous r
        JOIN medecin m ON r.idMedecin = m.idMedecin
        WHERE r.idUtilisateur = ? AND r.status IN ('completed','cancelled');
    `;
    console.log(`[HISTORIQUE] Fetching for userId=${userId}`);
    try {
        const [reservations] = await db.promise().query(query, [userId]);
        console.log(`[HISTORIQUE] Fetched ${reservations.length} reservations`);
        if (reservations.length === 0) {
            console.log("[HISTORIQUE] No records found, sending empty array");
            return res.json([]);
        }
        res.json(reservations);
    } catch (err) {
        console.error("[HISTORIQUE] Database Error:", err.sqlMessage || err);
        res.status(500).json({ error: "Erreur interne du serveur", details: err.sqlMessage });
    }
});

//get specific user
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    console.log("Fetching user with ID:", userId);

    const query = `
        SELECT 
            nom, 
            picture, 
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
            CASE
                WHEN email IS NOT NULL AND numTel IS NOT NULL THEN CONCAT('Email: ', email, ', Tel: ', numTel)
                WHEN email IS NOT NULL THEN email
                WHEN numTel IS NOT NULL THEN numTel
                ELSE NULL
            END AS contact_info
        FROM utilisateur
        WHERE idUtilisateur = ?
    `;
    try {
        const [results] = await db.promise().query(query, [userId]);
        console.log("Query result:", results);
        if (results.length === 0) {
            console.warn("User not found for ID:", userId);
            return res.status(404).json({ error: "compte non trouvée" });
        }
        res.json(results[0]);
    } catch (err) {
        console.error("Database Error:", err.sqlMessage || err);
        return res.status(500).json({ error: "Erreur interne du serveur", details: err.sqlMessage });
    }
});

//modifier password

app.post('/api/changePassword', [
    body('identifier')
        .trim()
        .notEmpty()
        .withMessage('Un identifiant est requis'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
        .matches(/\d/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, newPassword } = req.body;
    const queryField = validator.isEmail(identifier) ? 'email' : 'numTel';

    console.log(`Password change requested for ${queryField}: ${identifier}`);

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [results] = await db.promise().query(
            `UPDATE utilisateur SET motPass= ? WHERE ${queryField} = ?`,
            [hashedPassword, identifier]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Compte non trouvé" });
        }

        console.log("Password updated successfully!");
        return res.json({ success: true, message: "Mot de passe mis à jour avec succès" });
    } catch (err) {
        console.error("Error during password change:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
});

//get a specific doctor 
app.get("/api/doctors/:id", async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Received GET request on /api/doctors/:id`);
    const id = req.params.id;
    console.log(`[${timestamp}] Extracted doctor ID from params:`, id, "| Type:", typeof id);
    try {
        if (!db) {
            console.error(`[${timestamp}]  Database connection object (db) is undefined!`);
            return res.status(500).json({ error: "erreur server" });
        }
        if (!db.promise || typeof db.promise !== "function") {
            console.error(`[${timestamp}]  db.promise is not a function or undefined`);
            return res.status(500).json({ error: "erreur server" });
        }
        const query = "SELECT * FROM medecin WHERE idMedecin = ?";
        console.log(`[${timestamp}] Executing SQL query: ${query}`);
        console.log(`[${timestamp}] Query parameters:`, [id]);
        const [doctors] = await db.promise().query(query, [id]);
        console.log(`[${timestamp}] Query executed successfully`);
        console.log(`[${timestamp}] Doctors returned:`, doctors.length);
        if (doctors.length > 0) {
            console.log(`[${timestamp}] First doctor fetched:`, doctors[0]);
            res.json({ doctor: doctors[0] });
        } else {
            console.warn(`[${timestamp}]  No doctor found with ID:`, id);
            res.status(404).json({ error: "Médecin introuvable" });
        }
    } catch (error) {
        console.error(`[${timestamp}] Error during query execution`);
        console.error(`[${timestamp}] Error message:`, error.message);
        console.error(`[${timestamp}] Stack trace:\n`, error.stack);
        res.status(500).json({ error: "erreur server", details: error.message });
    }
});

//get a doctors planning
app.get('/api/planning/:id', async (req, res) => {
    const doctorId = req.params.id;
    console.log("Fetching planning for doctor with ID:", doctorId);
    const query = `
  SELECT 
    DATE_FORMAT(d.date, '%Y-%m-%d') AS date,
    TIME_FORMAT(d.time, '%H:%i') AS temps
FROM disponibilite AS d
JOIN planning_day AS pd ON d.planning_day_id = pd.id
JOIN planning AS p ON pd.planning_id = p.idPlanning
WHERE p.idMedecin = ? 
  AND d.status = 'available';
    `;
    try {
        const [results] = await db.promise().query(query, [doctorId]);
        console.log("Query result:", results);
        if (results.length === 0) {
            console.warn("No available time slots found for doctor ID:", doctorId);
            return res.status(404).json({ error: "Aucun créneau horaire disponible trouvé" });
        }
        res.json(results);
    } catch (err) {
        console.error("Database Error:", err.sqlMessage || err);
        return res.status(500).json({ error: "erreur server", details: err.sqlMessage });
    }
});

//modifier profile
app.post('/api/updateProfile', async (req, res) => {
    const { idUtilisateur, nom, picture } = req.body;
    if (!idUtilisateur || !nom || !picture) {
        return res.status(400).json({ error: "un nom d'utilisateur ou une photo de profil sont requis" });
    }

    const query = "UPDATE utilisateur SET nom = ?, picture = ? WHERE idUtilisateur = ?";

    try {
        const [result] = await db.promise().query(query, [nom, picture, idUtilisateur]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        res.json({ success: true, message: "Profil mis à jour avec succès" });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ error: "erreur server" });
    }
});

//ajouter reservation
app.post("/api/reservations", async (req, res) => {
    try {
        const { idMedecin, idUtilisateur, date, heure } = req.body;
        if (!idMedecin || !idUtilisateur || !date || !heure) {
           console.error({ error: "All fields are required: idMedecin, idUtilisateur, date, heure" });
        }
        const checkQuery = `SELECT * FROM rendezvous WHERE idUtilisateur = ? AND date = ? AND heure = ? AND status='ongoing' `;
        const [existing] = await db.promise().query(checkQuery, [idUtilisateur, date, heure]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Vous avez déjà une réservation à ce moment" });
        }
        const dispoQuery = `
            SELECT d.idDisponibilite FROM disponibilite d
            JOIN planning_day pd ON d.planning_day_id = pd.id
            JOIN planning p ON pd.planning_id = p.idPlanning
            WHERE p.idMedecin = ? AND d.date = ? AND d.time = ? AND d.status = 'available'
            LIMIT 1
        `;
        const [dispoRows] = await db.promise().query(dispoQuery, [idMedecin, date, heure]);
        if (dispoRows.length === 0) {
            return res.status(400).json({ error: "Aucun créneau disponible pour la date et l'heure sélectionnées" });
        }
        const disponibiliteId = dispoRows[0].idDisponibilite;
        const insertQuery = `
            INSERT INTO rendezvous (idMedecin, idUtilisateur, date, heure, status, disponibilite_id)
            VALUES (?, ?, ?, ?, 'ongoing', ?)
        `;
        const [result] = await db.promise().query(insertQuery, [idMedecin, idUtilisateur, date, heure, disponibiliteId]);
        const updateDispoQuery = `UPDATE disponibilite SET status = 'booked' WHERE idDisponibilite = ?`;
        await db.promise().query(updateDispoQuery, [disponibiliteId]);
        res.status(201).json({ message: "Réservation ajoutée avec succès", reservationId: result.insertId });
    } catch (error) {
        console.error("Error adding reservation:", error);
        res.status(500).json({ error: "ERREUR SERVER" });
    }
});


//get notifications 
app.get('/api/notifications/:user_id', async (req, res) => {
    const userId = req.params.user_id;  
    console.log('Received user_id:', userId);
    if (!userId) {
      console.log('Error: Missing user_id');
      return res.status(400).json({ error: "utilisateur non trouvé" });
    }
    try {
      console.log('Running query to fetch notifications for user:', userId);
  
      const [notifications] = await db.promise().query(
        `SELECT 
    n.id,
    n.idRendezvous,
    n.message,
    n.user_id,
    DATE_FORMAT(n.created_at, '%Y-%m-%d') AS created_at
FROM 
    notifications n
WHERE 
    n.user_id = ? 
ORDER BY 
    n.created_at DESC`,
        [userId]
      );
      console.log('Notifications fetched:', notifications);
  
      if (notifications.length === 0) {
        console.log('No notifications found for user:', userId);
      }
  
      res.json(notifications); 
    } catch (error) {
      console.error('Error occurred while fetching notifications:', error);
      res.status(500).json({ error: "erreur server" });
    }
  });

  
  app.get('/api/notification/:notificationId', async (req, res) => {
    const notificationId = req.params.notificationId;
    if (!notificationId) {
      console.error( "Missing notification ID" );
    }
    try {
      const [notification] = await db.promise().query(
        `SELECT
    id,
    idRendezvous,
    message,
    user_id,
    DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
    FROM notifications WHERE id = ?`,
        [notificationId]
      );
      if (notification.length === 0) {
        return res.status(404).json({ error: "Notification non trouvée" });
      }
      const idRendezvous = notification[0].idRendezvous;
      if (idRendezvous === null) {
        return res.status(404).json({ error: "Aucun rendez-vous associé à cette notification" });
      }
      const [rendezvous] = await db.promise().query(
        `SELECT 
    r.idRendezvous,
    DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
    TIME_FORMAT(r.heure, '%H:%i') AS heure,
    r.idUtilisateur,
    r.status,
    m.nom AS nomMedecin
FROM 
    rendezvous r
JOIN 
    medecin m ON r.idMedecin = m.idMedecin
WHERE 
    r.idRendezvous = ?`,
        [idRendezvous]
      );
      if (rendezvous.length === 0) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }
      res.json({
        notification: notification[0],
        rendezvous: rendezvous[0]
      });
    } catch (error) {
      console.error('Error occurred while fetching notification and rendezvous:', error);
      res.status(500).json({ error: "erreur server" });
    }
  });

  //annuler rendezvous  dans notification

app.put('/api/reservation/cancel/:id', async (req, res) => {
    const notificationId = req.params.id;
    console.log("[DEBUG] Received cancel request for notification ID:", notificationId);
    try {
        const [notifRows] = await db.promise().query(
            'SELECT idRendezvous FROM notifications WHERE id = ?',
            [notificationId]
        );
        console.log("[DEBUG] Notification query result:", notifRows);
        if (notifRows.length === 0 || notifRows[0].idRendezvous == null) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notification non trouvée ou non liée à un rendez-vous.' 
            });
        }
        const idRendezVous = notifRows[0].idRendezvous;
        const [rdvRows] = await db.promise().query(
            'SELECT disponibilite_id, status FROM rendezvous WHERE idRendezVous = ?',
            [idRendezVous]
        );
        console.log("[DEBUG] Rendezvous query result:", rdvRows);
        if (rdvRows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le rendez-vous nexiste pas.' 
            });
        }
        if (rdvRows[0].status !== 'ongoing') {
            return res.status(400).json({ 
                success: false, 
                message: 'Le rendez-vous nest pas en cours.' 
            });
        }
        const disponibiliteId = rdvRows[0].disponibilite_id;
        console.log("[DEBUG] Found disponibilite ID to release:", disponibiliteId);
        const [updateResult] = await db.promise().query(
            'UPDATE rendezvous SET status = ? WHERE idRendezVous = ?',
            ['cancelled', idRendezVous]
        );
        console.log("[DEBUG] Rendezvous update result:", updateResult);
        if (disponibiliteId) {
            const [dispUpdateResult] = await db.promise().query(
                'UPDATE disponibilite SET status = ? WHERE idDisponibilite = ?',
                ['available', disponibiliteId]
            );
            console.log("[DEBUG] Disponibilite update result:", dispUpdateResult);
        }
        res.json({ 
            success: true, 
            message: 'Rendez-vous annulé et disponibilité libérée (le cas échéant).' 
        });
    } catch (error) {
        console.error('[ERROR] Error cancelling rendezvous:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de lannulation du rendez-vous.' 
        });
    }
});

//annuler rendezvous using rendezvous page
app.put('/api/rendezvous/cancel/:idRendezVous', async (req, res) => {
    const idRendezVous = req.params.idRendezVous;
    console.log("[DEBUG] Received cancel request for rendezvous ID:", idRendezVous);

    try {
        const [rdvRows] = await db.promise().query(
            'SELECT disponibilite_id, status FROM rendezvous WHERE idRendezVous = ?',
            [idRendezVous]
        );
        console.log("[DEBUG] Rendezvous query result:", rdvRows);

        if (rdvRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Rendez-vous non trouvé.' 
            });
        }

        if (rdvRows[0].status !== 'ongoing') {
            return res.status(400).json({ 
                success: false, 
                message: 'Le rendez-vous nest pas en cours.' 
            });
        }

        const disponibiliteId = rdvRows[0].disponibilite_id;
        console.log("[DEBUG] Found disponibilite ID to release:", disponibiliteId);

        const [updateResult] = await db.promise().query(
            'UPDATE rendezvous SET status = ? WHERE idRendezVous = ?',
            ['cancelled', idRendezVous]
        );
        console.log("[DEBUG] Rendezvous update result:", updateResult);

        if (disponibiliteId) {
            const [dispUpdateResult] = await db.promise().query(
                'UPDATE disponibilite SET status = ? WHERE idDisponibilite = ?',
                ['available', disponibiliteId]
            );
            console.log("[DEBUG] Disponibilite update result:", dispUpdateResult);
        }

        res.json({ 
            success: true, 
            message: 'Rendez-vous annulé et disponibilité libérée (le cas échéant).' 
        });
    } catch (error) {
        console.error('[ERROR] Error cancelling rendezvous:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de lannulation du rendez-vous.' 
        });
    }
});

//create or modify planning 
app.post("/api/admin/create-planning", async (req, res) => {
    console.log("Received POST request on /api/admin/create-planning");
    const { doctorId, days, startTime, endTime } = req.body;
    console.log("Request payload:", { doctorId, days, startTime, endTime, });
    if (!doctorId || !Array.isArray(days) || !startTime || !endTime) {
        console.error("Missing required fields");
        return res.status(400).json({ error: "Champs obligatoires manquants." });
    }
    try {
        if (!db || !db.promise) {
            console.error("Database connection or promise wrapper is undefined!");
            return res.status(500).json({ error: "erreur server" });
        }
        const conn = db.promise();
        const [existing] = await conn.query("SELECT idPlanning FROM planning WHERE idMedecin = ?", [doctorId]);
        let planningId;
        if (existing.length > 0) {
            planningId = existing[0].idPlanning;
            console.log(`Planning found for doctor ${doctorId}, id: ${planningId}. Deleting old days...`);
            await conn.query("DELETE FROM planning_day WHERE planning_id = ?", [planningId]);
        } else {
            const [insertRes] = await conn.query("INSERT INTO planning (idMedecin) VALUES (?)", [doctorId]);
            planningId = insertRes.insertId;
            console.log(`New planning created for doctor ${doctorId}, id: ${planningId}`);
        }
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (const dayIndex of days) {
            const dayName = dayNames[dayIndex];
            if (!dayName) {
                console.warn(`Invalid day index: ${dayIndex}, skipping.`);
                continue;
            }
            await conn.query(
                `INSERT INTO planning_day (day_of_week, start_time, end_time, planning_id) VALUES (?, ?, ?, ?)`,
                [dayName, startTime, endTime, planningId]
            );
            console.log(`Inserted planning_day: ${dayName}`);
        }
        try {
                await generateWeeklyDisponibilities();
            console.log("Disponibilities for next week generated.");
        } catch (err) {
            console.error("Disponibility generation failed, but planning was created.", err);
        }
        res.status(200).json({ message: "Planning créé et disponibilités générées." });
    } catch (error) {
        console.error("Error in /api/admin/create-planning:", error.message);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ error: "erreur server" });
    }
});

//view doctor stats 
app.post("/api/admin/doctors/stats", async (req, res) => {
    try {
        const totalDoctorsQuery = `SELECT COUNT(*) AS totalDoctors FROM medecin`;
        const [totalDoctorsResult] = await db.promise().query(totalDoctorsQuery);
        const totalDoctors = totalDoctorsResult[0].totalDoctors;
        const doctorsWithAvailabilityQuery = `
            SELECT COUNT(DISTINCT m.idMedecin) AS availableD
            FROM medecin m
            JOIN planning p ON m.idMedecin = p.idMedecin
            JOIN planning_day pd ON p.idPlanning = pd.planning_id
            JOIN disponibilite d ON pd.id = d.planning_day_id
            WHERE d.status = 'available'
        `;
        const [availabilityResult] = await db.promise().query(doctorsWithAvailabilityQuery);
        const availableD = availabilityResult[0].availableD;
        res.status(200).json({
            totalDoctors,
            availableD
        });
    } catch (error) {
        console.error("Error fetching doctor statistics:", error);
        res.status(500).json({ error: "erreur server" });
    }
});

//view patient status
app.post("/api/admin/patients/stats", async (req, res) => {
    try {
        const totalQuery = `SELECT COUNT(*) AS total FROM utilisateur WHERE type = 'patient'`;
        const [totalRows] = await db.promise().query(totalQuery);

        const activeQuery = `
            SELECT COUNT(DISTINCT u.idUtilisateur) AS active
            FROM utilisateur u
            JOIN rendezvous r ON u.idUtilisateur = r.idUtilisateur
            WHERE u.type = 'patient'
        `;
        const [activeRows] = await db.promise().query(activeQuery);

        const bannedQuery = `SELECT COUNT(*) AS banned FROM utilisateur WHERE type = 'patient' AND status = 'banned'`;
        const [bannedRows] = await db.promise().query(bannedQuery);

        res.status(200).json({
            total: totalRows[0].total,
            active: activeRows[0].active,
            banned: bannedRows[0].banned
        });
    } catch (err) {
        console.error("Error fetching patient stats:", err);
        res.status(500).json({ error: "Échec de la récupération des statistiques du patient" });
    }
});

//view rendezvous stats
app.post("/api/admin/appointments/stats", async (req, res) => {
    try {
      const [total] = await db.promise().query("SELECT COUNT(*) AS total FROM rendezvous");
      const [ongoing] = await db.promise().query("SELECT COUNT(*) AS ongoing FROM rendezvous WHERE status = 'ongoing'");
      const [completed] = await db.promise().query("SELECT COUNT(*) AS completed FROM rendezvous WHERE status = 'completed'");
      const [cancelled] = await db.promise().query("SELECT COUNT(*) AS cancelled FROM rendezvous WHERE status = 'cancelled'");
  
      res.json({
        total: total[0].total,
        ongoing: ongoing[0].ongoing,
        completed: completed[0].completed,
        cancelled: cancelled[0].cancelled
      });
    } catch (err) {
      console.error("Error fetching appointment stats:", err);
      res.status(500).json({ error: "erreur server" });
    }
  });

//FAVORITES PAGE
  app.get("/api/favorites", async (req, res) => {
    const patientId = req.query.id;
    if (!patientId) {
      return res.status(400).json({ error: "Missing patient ID" });
    }
    try {
      const query = `
        SELECT 
          m.idMedecin,
          m.nom,
          m.specialite,
          m.numTel,
          m.diplome,
          m.picture
        FROM favoris f
        JOIN medecin m ON f.idMedecin = m.idMedecin
        WHERE f.idPatient = ?
      `;
      const [favorites] = await db.promise().query(query, [patientId]);
      res.json({ favorites });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "erreur server" });
    }
  });

  // doctor popularity 
  app.get("/api/favorites/count", async (req, res) => {
    const doctorId = req.query.id;
    try {
      let query;
      let params = [];
      if (doctorId) {
        query = `
          SELECT idMedecin, COUNT(*) AS totalFavorites
          FROM favoris
          WHERE idMedecin = ?
          GROUP BY idMedecin
        `;
        params.push(doctorId);
      } else {
        query = `
          SELECT idMedecin, COUNT(*) AS totalFavorites
          FROM favoris
          GROUP BY idMedecin
        `;
      }
      const [results] = await db.promise().query(query, params);
      res.json({ favoritesCount: results });
    } catch (error) {
      console.error("Error fetching favorite counts:", error);
      res.status(500).json({ error: "erreur server" });
    }
  });

  //ajouter favoris
  app.post("/api/favorite", async (req, res) => {
    const { idUtilisateur, idMedecin } = req.body;
    if (!idUtilisateur || !idMedecin) {
      return res.status(400).json({ error: "IDPatient ou idMedecin manquant" });
    }
    try {
      const [existing] = await db.promise().query(
        `
        SELECT 1
        FROM favoris
        WHERE idPatient = ? AND idMedecin = ?
        LIMIT 1
        `,
        [idUtilisateur, idMedecin]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "Docteur déjà dans les favoris." });
      }
      await db.promise().query(
        `
        INSERT INTO favoris (idPatient, idMedecin)
        VALUES (?, ?)
        `,
        [idUtilisateur, idMedecin]
      );
      res.status(201).json({ message: "Docteur ajouté aux favoris." });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: "erreur server" });
    }
  });
  //  do u love me
  app.get('/api/favorites/is-favorited', async (req, res) => {
    const { idUtilisateur, idMedecin } = req.query;
    if (!idUtilisateur || !idMedecin) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }
    try {
        const [rows] = await db.promise().query(
            'SELECT 1 FROM favoris WHERE idPatient = ? AND idMedecin = ? LIMIT 1',
            [idUtilisateur, idMedecin]
        );
        res.json({ isFavorited: rows.length > 0 });
    } catch (error) {
        console.error("Error checking favorite:", error);
        res.status(500).json({ error: 'erreur server' });
    }
});

//i no no like u no more 
app.delete('/api/favorite', async (req, res) => {
    const { idUtilisateur, idMedecin } = req.query;
    if (!idUtilisateur || !idMedecin) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    try {
      const [result] = await db.promise().query(
        'DELETE FROM favoris WHERE idPatient = ? AND idMedecin = ?',
        [idUtilisateur, idMedecin]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Favori non trouvé' });
      }
  
      res.status(200).json({ message: 'Favori supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting favorite:', error.message);
      res.status(500).json({ error: 'erreur server' });
    }
  });

//looking like a sigma
  app.post("/api/upload-profile-pic", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier téléchargé" });
    }
    const ext = path.extname(req.file.originalname);
    const filename = req.file.filename;
    const correctedFilename = filename.endsWith(ext) ? filename : filename + ext;

    const imageUrl = `/uploads/${correctedFilename}`;
    res.json({ imageUrl });
});

// change ur name and change ur heart
app.put("/api/doctors/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, specialite, numTel, diplome, imageUrl } = req.body;
        if (!nom && !specialite && !numTel && !diplome && !imageUrl) {
            return res.status(400).json({ error: "Au moins un champ doit être fourni pour la mise à jour" });
        }
        const fields = [];
        const values = [];
        if (nom) {
            fields.push("nom = ?");
            values.push(nom);
        }
        if (specialite) {
            fields.push("specialite = ?");
            values.push(specialite);
        }
        if (numTel) {
            fields.push("numTel = ?");
            values.push(numTel);
        }
        if (diplome) {
            fields.push("diplome = ?");
            values.push(diplome);
        }
        if (imageUrl) {
            fields.push("picture = ?");
            values.push(imageUrl);
        }
        const query = `UPDATE medecin SET ${fields.join(", ")} WHERE idMedecin = ?`;
        values.push(id);
        const [result] = await db.promise().query(query, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Médecin introuvable" });
        }
        res.json({ message: "Le médecin a été mis à jour avec succès" });
    } catch (error) {
        console.error("Error updating doctor:", error);
        res.status(500).json({ error: "erreur server " });
    }
});

//GOATED DOCTORS
app.post("/api/admin/doctors/top", async (req, res) => {
    console.log("Received request for top doctors");
    try {
      const [results] = await db.promise().query(`
        SELECT m.idMedecin, m.nom, m.specialite, COUNT(r.idMedecin) AS total_reservations
        FROM rendezvous r
        JOIN medecin m ON r.idMedecin = m.idMedecin
        GROUP BY r.idMedecin
        ORDER BY total_reservations DESC
        LIMIT 10
      `);
      console.log("Top doctors query results:", results);
      res.json({ topDoctors: results });
    } catch (err) {
      console.error("Error fetching top doctors:", err);
      res.status(500).json({ error: "erreur server" });
    }
  });

  //bad users
  app.post("/api/admin/users/cancellations", async (req, res) => { 
    console.log("Received request for top cancelling users");
    try {
      const [results] = await db.promise().query(`
        SELECT u.idUtilisateur, u.nom, COUNT(r.idUtilisateur) AS total_cancellations
        FROM rendezvous r
        JOIN utilisateur u ON r.idUtilisateur = u.idUtilisateur
        WHERE r.status = 'cancelled'
        GROUP BY r.idUtilisateur
        ORDER BY total_cancellations DESC
        LIMIT 10
      `);
      console.log("Top cancelling users query results:", results);
      res.json({ topCancellers: results });
    } catch (err) {
      console.error("Error fetching top cancelling users:", err);
      res.status(500).json({ error: "erreur server" });
    }
  });
  
  //latest appointments 
  app.post("/api/admin/appointments/latest", async (req, res) => {
    console.log(" Received request for latest appointments");
  
    try {
      const [results] = await db.promise().query(`
        SELECT r.idRendezvous,
          DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
         TIME_FORMAT(r.heure, '%H:%i') AS heure,
          r.status,
               u.nom AS patient_name, m.nom AS doctor_name
        FROM rendezvous r
        JOIN utilisateur u ON r.idUtilisateur = u.idUtilisateur
        JOIN medecin m ON r.idMedecin = m.idMedecin
        ORDER BY r.date DESC, r.heure DESC
        LIMIT 10
      `);

  
      console.log(" Latest appointments query results:", results);
      res.json({ latestAppointments: results });
    } catch (err) {
      console.error(" Error fetching latest appointments:", err);
      res.status(500).json({ error: "erreur server" });
    }
  });


  //all users
  app.get("/api/patients", async (req, res) => {
    console.log("Received GET request on /api/patients");
    try {
        const query = `
            SELECT u.*, p.DateNais 
            FROM utilisateur u 
            JOIN patient p ON u.idUtilisateur = p.idUtilisateur 
            WHERE u.type = 'patient'
            ORDER BY u.nom ASC
        `;
        console.log("Executing query:", query);
        if (!db || !db.promise) {
            console.error("Database connection or promise wrapper is undefined!");
            return res.status(500).json({ error: "erreur server" });
        }
        const [patients] = await db.promise().query(query);
        console.log("Query successful. Number of patients fetched:", patients.length);
        if (patients.length > 0) {
            console.log("First patient fetched:", patients[0]);
        }
        res.json({ patients });
    } catch (error) {
        console.error("Error fetching patients:", error.message);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ error: "erreur server" });
    }
});

//kill da ho
app.put('/api/users/:userId/ban', async (req, res) => {
  const userId = req.params.userId;
  console.log(`[BAN] Received ban request for user ID: ${userId}`);

  try {
    const [rows] = await db.promise().query('SELECT type, status FROM utilisateur WHERE idUtilisateur = ?', [userId]);
    console.log(`[BAN] User fetch result:`, rows);

    if (!rows.length) {
      console.warn(`[BAN] User ID ${userId} not found`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = rows[0];

    if (user.type !== 'patient') {
      console.warn(`[BAN] User ID ${userId} is not a patient (type: ${user.type})`);
      return res.status(400).json({ message: 'Lutilisateur nest pas un patient' });
    }

    if (user.status === 'banned') {
      console.warn(`[BAN] User ID ${userId} is already banned`);
      return res.status(400).json({ message: 'Utilisateur déjà bloqué' });
    }

    await db.promise().query('UPDATE utilisateur SET status = ? WHERE idUtilisateur = ?', ['banned', userId]);
    console.log(`[BAN] User ID ${userId} has been banned successfully`);

    return res.json({ message: 'Patient banni avec succès' });
  } catch (error) {
    console.error(`[BAN] Unexpected error:`, error);
    return res.status(500).json({ message: 'erreur server' });
  }
});


//arise
app.put('/api/users/:id/unban', async (req, res) => {
  const userId = req.params.id;
  console.log(`[UNBAN] Received request to unban user ID: ${userId}`);
  try {
    const [rows] = await db.promise().query('SELECT type, status FROM utilisateur WHERE idUtilisateur = ?', [userId]);
    console.log(`[UNBAN] Fetched user:`, rows);
    if (!rows.length) {
      console.warn(`[UNBAN] No user found with ID ${userId}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    if (rows[0].type !== 'patient') {
      console.warn(`[UNBAN] User with ID ${userId} is not a patient (type: ${rows[0].type})`);
      return res.status(400).json({ message: 'Lutilisateur nest pas un patient' });
    }
    if (rows[0].status !== 'banned') {
      console.warn(`[UNBAN] User with ID ${userId} is not banned (current status: ${rows[0].status})`);
      return res.status(400).json({ message: 'Lutilisateur nest pas bloqué' });
    }

    await db.promise().query('UPDATE utilisateur SET status = ? WHERE idUtilisateur = ?', ['active', userId]);
    console.log(`[UNBAN] User ID ${userId} successfully unbanned`);

    return res.json({ message: 'Patient débloqué avec succès' });
  } catch (error) {
    console.error(`[UNBAN] Error during unban:`, error);
    return res.status(500).json({ message: 'erreur server' });
  }
});

  
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'front/www/index.html'));
});
const PORT = 5000;
app.listen(PORT,'0.0.0.0',() => {
    console.log(`Server running at https://localhost:${PORT}`);
});
