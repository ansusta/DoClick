import { URL, loadRemoteURL } from './config.js';

async function loadReservations() {
    await loadRemoteURL();
            const authorized = await checkAuthorization();
  if (!authorized) return;
    try {
        checkAuthorization();

        const upcomingResponse = await fetch(`${URL}/api/reservations`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        if (!upcomingResponse.ok) {
            throw new Error(`HTTP error! status: ${upcomingResponse.status}`);
        }
        const upcomingData = await upcomingResponse.json();
        const upcomingReservations = upcomingData.reservations;
        console.log("reservations futures:",upcomingReservations);

        const historyResponse = await fetch(`${URL}/api/historique`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        if (!historyResponse.ok) {
            throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }
        const historyData = await historyResponse.json();
        const historyReservations = historyData.reservations;
        console.log("historique:",historyReservations)

        displayReservations(upcomingReservations, historyReservations);
    } catch (error) {
        console.error("Error fetching reservations:", error);
        alert("Failed to load reservations. Please check the console for details.");
    }
}
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
function displayReservations(upcomingReservations, historyReservations) {
    const upcomingList = document.getElementById("upcomingList");
    const historyList = document.getElementById("historyList");
    upcomingList.innerHTML = "";
    historyList.innerHTML = "";

    upcomingReservations.forEach(res => {
        let li = document.createElement("li");
        li.className = "list-group-item user-card";
        li.setAttribute("data-bs-toggle", "modal");
        li.setAttribute("data-bs-target", "#reservationModal");
        // Use correct data-* attributes for Bootstrap modal
        li.setAttribute("data-doctor", res.medecin);
        li.setAttribute("data-user", res.user);
        li.setAttribute("data-date", res.date);
        li.setAttribute("data-time", res.heure);
        li.setAttribute("data-specialty", res.specialite || "N/A");
        li.setAttribute("data-status", res.status || "Confirmed");

        li.innerHTML = `
            <div class="card-body">
                <h5>${res.medecin}</h5>
                <p>🕐 ${res.heure}</p>
            </div>
        `;
        upcomingList.appendChild(li);
    });

    // History Reservations
    historyReservations.forEach(res => {
        let li = document.createElement("li");
        li.className = "list-group-item user-card";
        li.setAttribute("data-bs-toggle", "modal");
        li.setAttribute("data-bs-target", "#reservationModal");
        li.setAttribute("data-doctor", res.medecin);
        li.setAttribute("data-user", res.user);
        li.setAttribute("data-date", res.date);
        li.setAttribute("data-time", res.heure);
        li.setAttribute("data-specialty", res.specialite || "N/A");
        li.setAttribute("data-status", res.status || "Completed");

        li.innerHTML = `
            <div class="card-body">
                <h5>${res.medecin}</h5>
                <p>🕐 ${res.heure}</p>
            </div>
        `;
        historyList.appendChild(li);
    });
}

// Modal event handler - outside loops, only once!
$('#reservationModal').on('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const doctor = button.getAttribute('data-doctor');
    const date = button.getAttribute('data-date');
    const time = button.getAttribute('data-time');
    const specialty = button.getAttribute('data-specialty');
    const status = button.getAttribute('data-status');
    const user = button.getAttribute('data-user');

    const modalDoctor = document.getElementById('modalDoctor');
    const modalDate = document.getElementById('modalDate');
    const modalTime = document.getElementById('modalTime');
    const modalSpecialty = document.getElementById('modalSpecialty');
    const modalStatus = document.getElementById('modalStatus');
    const modalUser = document.getElementById('modalUser');

    modalDoctor.textContent = doctor;
    modalDate.textContent = date;
    modalTime.textContent = time;
    modalSpecialty.textContent = specialty || 'N/A';
    modalStatus.textContent = status || 'N/A';
    modalUser.textContent=user || 'N/A';

    // Reset classes first
    modalStatus.classList.remove('bg-success', 'bg-danger');

    if (status === 'Confirmed') {
        modalStatus.classList.add('bg-success');
    } else if (status === 'Cancelled') {
        modalStatus.classList.add('bg-danger');
    } else {
        // default or other statuses
        modalStatus.classList.add('bg-secondary');
    }
});

document.getElementById("btnUpcoming").addEventListener("click", function () {
    document.getElementById("upcomingSection").classList.remove("hidden");
    document.getElementById("historySection").classList.add("hidden");
    this.classList.add("btn-primary");
    this.classList.remove("btn-secondary");
    document.getElementById("btnHistory").classList.add("btn-secondary");
    document.getElementById("btnHistory").classList.remove("btn-primary");
});

document.getElementById("btnHistory").addEventListener("click", function () {
    document.getElementById("historySection").classList.remove("hidden");
    document.getElementById("upcomingSection").classList.add("hidden");
    this.classList.add("btn-primary");
    this.classList.remove("btn-secondary");
    document.getElementById("btnUpcoming").classList.add("btn-secondary");
    document.getElementById("btnUpcoming").classList.remove("btn-primary");
    checkAuthorization();
});

document.addEventListener("DOMContentLoaded", loadReservations);
