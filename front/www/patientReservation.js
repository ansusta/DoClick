import { URL, loadRemoteURL } from './config.js';
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        return payload?.id ? payload : null;
    } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
    }
}
async function fetchReservations() {
    await loadRemoteURL();
    const token = localStorage.getItem("auth_token");
    if (!token) {
        showNotLoggedInMessage();
        return;
    }
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.id) {
        showNotLoggedInMessage();
        return;
    }
    try {
        const userId = decoded.id;
        console.log("Decoded userId:", userId);
        const upcomingRes = await fetch(`${URL}/api/reservations/${userId}`,{
            headers:{
                "ngrok-skip-browser-warning": "true"
            }
        });
        const historyRes = await fetch(`${URL}/api/historique/${userId}`,{
            headers:{
                "ngrok-skip-browser-warning": "true"
            }
        });
        const upcomingData = await upcomingRes.json();
        const historyData = await historyRes.json();
        console.log("upcoming data:", upcomingData);
        console.log("Historique data:", historyData);
        displayReservations(upcomingData, historyData);
    } catch (err) {
        console.error("[FETCH] Failed to load reservations:", err);
        document.getElementById("upcomingList").innerHTML = `<li class="list-group-item text-danger">Erreur de chargement</li>`;
        document.getElementById("historyList").innerHTML = `<li class="list-group-item text-danger">Erreur de chargement</li>`;
    }
    
}
function showNotLoggedInMessage() {
    const message = `<li class="list-group-item text-warning">Vous devez être connecté pour voir vos rendez-vous.</li>`;
    document.getElementById("upcomingList").innerHTML = message;
    document.getElementById("historyList").innerHTML = message;
}
function displayReservations(upcoming, history) {
    const upcomingList = document.getElementById("upcomingList");
    const historyList = document.getElementById("historyList");

    upcomingList.innerHTML = "";
    historyList.innerHTML = "";

    if (upcoming.length === 0) {
        upcomingList.innerHTML = `<li class="list-group-item text-muted">Aucun rendez-vous à venir.</li>`;
    } else {
        upcoming.forEach(app => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";

            const info = document.createElement("div");
            info.innerHTML = `<strong>${app.medecin}</strong><br><small>${app.date}</small>`;

            const btnGroup = document.createElement("div");
            btnGroup.className = "btn-group";

            const viewBtn = document.createElement("button");
            viewBtn.className = "btn btn-sm btn-success";
            viewBtn.textContent = "Voir";
            viewBtn.addEventListener("click", () => showModal(app));

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "btn btn-sm btn-danger";
            cancelBtn.textContent = "Annuler";
            cancelBtn.dataset.id = app.id;
            cancelBtn.addEventListener("click", () => cancelReservation(app.idRendezVous));

            btnGroup.appendChild(viewBtn);
            btnGroup.appendChild(cancelBtn);

            li.appendChild(info);
            li.appendChild(btnGroup);
            upcomingList.appendChild(li);
        });
    }

    if (history.length === 0) {
        historyList.innerHTML = `<li class="list-group-item text-muted">Aucun historique trouvé.</li>`;
    } else {
        history.forEach(app => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.innerHTML = `<strong>${app.medecin}</strong><br><small>${app.date}</small><span class="badge bg-secondary">${app.status}</span>`;
            historyList.appendChild(li);
        });
    }
}

document.getElementById("btnUpcoming").addEventListener("click", () => {
    document.getElementById("upcomingSection").classList.remove("hidden");
    document.getElementById("historySection").classList.add("hidden");
    toggleTab("btnUpcoming", "btnHistory");
});
document.getElementById("btnHistory").addEventListener("click", () => {
    document.getElementById("upcomingSection").classList.add("hidden");
    document.getElementById("historySection").classList.remove("hidden");
    toggleTab("btnHistory", "btnUpcoming");
});
function toggleTab(activeId, inactiveId) {
    document.getElementById(activeId).classList.add("btn-primary");
    document.getElementById(activeId).classList.remove("btn-secondary");
    document.getElementById(inactiveId).classList.add("btn-secondary");
    document.getElementById(inactiveId).classList.remove("btn-primary");
}

document.addEventListener("DOMContentLoaded", fetchReservations);
function showModal(app) {
    const modalBody = document.getElementById("modalBodyContent");
    modalBody.innerHTML = `
        <p><strong>Médecin :</strong> ${app.medecin}</p>
        <p><strong>Date :</strong> ${app.date}</p>
        <p><strong>Heure :</strong> ${app.heure}</p>
        <p><strong>Spécialité :</strong> ${app.specialite}</p>
        <p><strong>Statut :</strong> ${app.status}</p>
    `;
    const modal = new bootstrap.Modal(document.getElementById("viewModal"));
    modal.show();
}

async function cancelReservation(id) {
    if (!confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) return;
    try {
        const res = await fetch(`${URL}/api/rendezvous/cancel/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (!res.ok) throw new Error("Erreur lors de l'annulation");

        alert("Rendez-vous annulé.");
        fetchReservations();
    } catch (err) {
        console.error("Cancel error:", err);
        alert("Erreur lors de l'annulation du rendez-vous.");
    }
}
