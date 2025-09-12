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
async function init(){
  await loadRemoteURL();
        const authorized = await checkAuthorization();
  if (!authorized) return;
document.getElementById("planningForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const urlParams = new URLSearchParams(window.location.search);
const doctorId = urlParams.get("id");
    const days = Array.from(document.querySelectorAll("input[name='days']:checked")).map(cb => parseInt(cb.value));
    const payload = {
      doctorId,
      days,
      startTime,
      endTime,
    };
    const response = await fetch(`${URL}/api/admin/create-planning`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const statusEl = document.getElementById("status");
    if (response.ok) {
      statusEl.innerHTML = `<div class="alert alert-success">Planning created and disponibilities generated.</div>`;
      window.location.href = `/reserver.html?id=${doctorId}`;
    } else {
      const err = await response.text();
      statusEl.innerHTML = `<div class="alert alert-danger">Error: ${err}</div>`;
    }
  });
}

 
document.addEventListener("DOMContentLoaded", init);