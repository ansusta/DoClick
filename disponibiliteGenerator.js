const db = require('./db');
async function generateWeeklyDisponibilities() {
  const [planningDays] = await db.promise().query("SELECT * FROM planning_day");

  const today = new Date();
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() + (7 - today.getDay())); // Next Sunday

  const dayNameToIndex = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6
  };

  for (const pd of planningDays) {
    const dayOffset = (dayNameToIndex[pd.day_of_week] - nextWeekStart.getDay() + 7) % 7;
    const targetDate = new Date(nextWeekStart);
    targetDate.setDate(nextWeekStart.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split("T")[0];

    const [startH, startM] = pd.start_time.split(":").map(Number);
    const [endH, endM] = pd.end_time.split(":").map(Number);

    const start = new Date(targetDate);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(targetDate);
    end.setHours(endH, endM, 0, 0);

    for (let time = new Date(start); time < end; time.setMinutes(time.getMinutes() + 30)) {
      const heure = time.toTimeString().split(" ")[0]; 
      const [rows] = await db.promise().query(
        "SELECT 1 FROM disponibilite WHERE planning_day_id = ? AND date = ? AND time = ?",
        [pd.id, dateStr, heure]
      );
      if (rows.length === 0) {
        await db.promise().query(
          "INSERT INTO disponibilite (planning_day_id, date, time, status) VALUES (?, ?, ?, 'available')",
          [pd.id, dateStr, heure]
        );
        console.log(`Inserted slot: ${dateStr} ${heure} for day ID ${pd.id}`);
      } else {
        console.log(`Skipped existing slot: ${dateStr} ${heure} for day ID ${pd.id}`);
      }
    }
  }
  console.log("Disponibilities for next week generated.");
}

module.exports = { generateWeeklyDisponibilities };
