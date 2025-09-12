const cron = require('node-cron');
const db = require('./db');
const { generateWeeklyDisponibilities } = require('./disponibiliteGenerator');

async function sendNotification(userId, message, idRendezvous ) {
  const [result] = await db.promise().query(
    `INSERT INTO notifications (user_id, message, idRendezvous) VALUES (?, ?, ?)`,
    [userId, message, idRendezvous]
  );
  console.log(`Notification sent for user ${userId} with Rendezvous ID ${idRendezvous}`);
}

function startSchedulers() {
  cron.schedule('0 0 * * 6', () => {
    console.log('Generating weekly disponibilites...');
    generateWeeklyDisponibilities();
  });

    cron.schedule('25 9 * * *', async () => {
      console.log('Marking past disponibilites as booked...');
      const now = new Date();
      const nowStr = now.toISOString().slice(0, 16).replace("T", " "); 
      const [result] = await db.promise().query(`
        UPDATE disponibilite 
        SET status = 'booked' 
        WHERE status = 'available' 
        AND CONCAT(date, ' ', temps) < ?
      `, [nowStr]);
      console.log(`Marked ${result.affectedRows} disponibilites as booked.`);
    });
cron.schedule('25 9 * * 2', async () => {
  console.log('Deleting all disponibilites that are in the past...');
  const now = new Date();
  const nowStr = now.toISOString().slice(0, 16).replace("T", " "); 

  const [result] = await db.promise().query(`
    DELETE FROM disponibilite 
    WHERE CONCAT(date, ' ', temps) < ?
  `, [nowStr]);

  console.log(`Deleted ${result.affectedRows} old disponibilites.`);
});
  
  cron.schedule('27 9 * * *', async () => {
    console.log('Running daily check for tomorrow appointments...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const [appointments] = await db.promise().query(`SELECT idUtilisateur ,
            idRendezVous ,
            DATE_FORMAT(date, '%Y-%m-%d') AS date, 
            TIME_FORMAT(heure, '%H:%i') AS heure FROM rendezvous WHERE date = ? AND status='ongoing'`, [dateStr]);
    appointments.forEach(app => {
      sendNotification(app.idUtilisateur, `Rappel : Votre rendez-vous est prévu pour demain  ${app.date} ${app.heure}`, app.idRendezVous);
    });
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('Running hourly check for 1-hour appointments...');
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + (60 * 60 * 1000));
    const dateStr = oneHourLater.toISOString().split('T')[0];
    const timeStr = oneHourLater.toTimeString().substring(0, 5);
    const [appointments] = await db.promise().query(`SELECT  idUtilisateur ,
            idRendezVous ,
            DATE_FORMAT(date, '%Y-%m-%d') AS date, 
            TIME_FORMAT(heure, '%H:%i') AS heure FROM rendezvous WHERE date = ? AND heure = ? AND status='ongoing'`, [dateStr, timeStr]);
    appointments.forEach(app => {
      sendNotification(app.idUtilisateur, `Rappel : Votre rendez-vous est dans 1 heure à ${app.date} ${app.heure}`, app.idRendezVous);
    });
  });

  cron.schedule('0 * * * *', async () => {
    console.log('Checking for completed appointments...');
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);
    const [result] = await db.promise().query(`
      UPDATE rendezvous 
      SET status = 'completed' 
      WHERE 
        (date < ?) 
        OR (date = ? AND heure < ?)
        AND status != 'completed'
    `, [todayStr, todayStr, timeStr]);
    console.log(`Updated ${result.affectedRows} appointments to completed.`);
  });
}

module.exports = { startSchedulers };
