import { URL, loadRemoteURL } from './config.js';

async function checkAuthorization() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Vous n'êtes pas autorisé à accéder à cette page.");
    window.location.href = "/Login.html";
    return false;
  }

  try {
    const response = await fetch(`${URL}/api/protected`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true"
      }
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      alert(data.error || "Accès non autorisé.");
      window.location.href = "/Login.html";
      return false;
    }
    return true; 
  } catch (error) {
    console.error("Error verifying token:", error);
    alert("Échec de l'autorisation. Veuillez réessayer..");
    window.location.href = "/Login.html";
    return false;
  }
}

async function init() {
  await loadRemoteURL();
  const authorized = await checkAuthorization();
  if (!authorized) return;

  document.getElementById("addDoctorForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const nom = document.getElementById("nom").value.trim();
    const specialite = document.getElementById("specialite").value.trim();
    const numTel = document.getElementById("numTel").value.trim();
    const diplome = document.getElementById("diplome").value.trim();

    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${URL}/api/doctors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ nom, specialite, numTel, diplome })
    });

    const result = await response.json();
    const msgDiv = document.getElementById("message");

    if (response.ok) {
      msgDiv.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
      setTimeout(() => {
        window.location.href = `doctors.html?id=${result.doctorId}`;
      }, 1500);
    } else {
      msgDiv.innerHTML = `<div class="alert alert-danger">${result.error || 'Failed to add doctor.'}</div>`;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
