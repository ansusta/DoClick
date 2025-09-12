const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'medical_appointments'
});
const adminData = {
    nom: 'ansu',
    email: 'mytasusnaamv@gmail.com',
    numTel: '0562287381',
    motPass: '1PEARL1',
    picture: 'NULL',
    type: 'admin'
};

bcrypt.hash(adminData.motPass, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    const query = `
        INSERT INTO utilisateur (nom, email, numTel, motPass, picture, type)
        VALUES ('${adminData.nom}', '${adminData.email}', '${adminData.numTel}', '${hashedPassword}', '${adminData.picture}', '${adminData.type}')
    `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error inserting admin into the database:', err);
            return;
        }
        console.log('Admin added successfully:', result);
    });
});
