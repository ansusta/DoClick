import { URL as API_BASE_URL, loadRemoteURL } from './config.js';

let allPatients = [];

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function checkAuthorization() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    alert("Vous n'êtes pas autorisé à accéder à cette page.");
    window.location.href = "/Login.html";
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/protected`, {
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
    alert("Échec de l'autorisation. Veuillez réessayer.");
    window.location.href = "/Login.html";
    return false;
  }
}

async function fetchPatients() {
  try {
    await loadRemoteURL();
    const authorized = await checkAuthorization();
    if (!authorized) return;

    const res = await fetch(`${API_BASE_URL}/api/patients`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    if (!res.ok) {
      throw new Error("Failed to fetch patients");
    }

    const data = await res.json();
    allPatients = data.patients;
    const idFromURL = getIdFromURL();
    if (idFromURL) {
      const user = allPatients.find(p => p.idUtilisateur == idFromURL);
      if (user) {
        await openUserModal(user);
        return; 
      } else {
        alert("Utilisateur non trouvé avec l'ID spécifié.");
      }
    }

    renderPatients();
  } catch (err) {
    console.error("Error fetching patients:", err);
  }
}

/**
 * Fetches an image as a Blob and returns an object URL.
 * Falls back to a default image on failure.
 * @param {string} imagePath - The image path from API (relative URL).
 * @param {string} fallback - The fallback image URL.
 * @returns {Promise<string>} - URL for the image to use in src attribute.
 */
async function fetchImageBlobURL(imagePath, fallback = "https://placehold.co/400x300") {
  if (!imagePath) return fallback;
  try {
    const response = await fetch(`${API_BASE_URL}${imagePath}`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });
    if (!response.ok) throw new Error("Image fetch failed");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("Could not load image from API. Using fallback.", err);
    return fallback;
  }
}

async function openUserModal(patient) {
  document.getElementById("modalNom").textContent = patient.nom || "N/A";
  document.getElementById("modalEmail").textContent = patient.email || "N/A";
  document.getElementById("modalNumTel").textContent = patient.numTel || "N/A";
  document.getElementById("modalCreated").textContent = patient.created_at || "N/A";
  document.getElementById("modalNais").textContent = patient.DateNais || "N/A";
  document.getElementById("modalStatut").textContent = patient.status || "N/A";

  // Fetch image blob URL and set src
  const imgSrc = await fetchImageBlobURL(patient.picture);
  document.getElementById("modalPfp").src = imgSrc;

  const btnBan = document.getElementById("ban");
  const btnUnban = document.getElementById("unban");

  btnBan.replaceWith(btnBan.cloneNode(true));
  btnUnban.replaceWith(btnUnban.cloneNode(true));
  const newBtnBan = document.getElementById("ban");
  const newBtnUnban = document.getElementById("unban");

  newBtnBan.onclick = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${patient.idUtilisateur}/ban`, {
        method: "PUT",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const result = await res.json();

      if (res.ok) {
        alert("User banned successfully");
        const modal = bootstrap.Modal.getInstance(document.getElementById("userModal"));
        modal.hide();
        await fetchPatients();
      } else {
        alert(result.message || "Failed to ban user");
      }
    } catch (err) {
      console.error("Error banning user:", err);
      alert("An error occurred while banning the user.");
    }
  };

  newBtnUnban.onclick = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${patient.idUtilisateur}/unban`, {
        method: "PUT",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const result = await res.json();

      if (res.ok) {
        alert("User unbanned successfully");
        const modal = bootstrap.Modal.getInstance(document.getElementById("userModal"));
        modal.hide();
        await fetchPatients();
      } else {
        alert(result.message || "Failed to unban user");
      }
    } catch (err) {
      console.error("Error unbanning user:", err);
      alert("An error occurred while unbanning the user.");
    }
  };

  if (patient.status === "active") {
    newBtnBan.style.display = "inline-block";
    newBtnUnban.style.display = "none";
  } else if (patient.status === "banned") {
    newBtnBan.style.display = "none";
    newBtnUnban.style.display = "inline-block";
  } else {
    newBtnBan.style.display = "none";
    newBtnUnban.style.display = "none";
  }

  const modal = new bootstrap.Modal(document.getElementById("userModal"));
  modal.show();
}

async function renderPatients() {
  const container = document.getElementById("patientContainer");
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const sortOrder = document.getElementById("sortSelect").value;

  const filtered = allPatients.filter(p =>
    p.nom.toLowerCase().includes(searchTerm) ||
    (p.email && p.email.toLowerCase().includes(searchTerm))
  );
  filtered.sort((a, b) => {
    const nameA = a.nom.toLowerCase();
    const nameB = b.nom.toLowerCase();
    return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  container.innerHTML = "";

  // For performance, preload all images first
  const imagePromises = filtered.map(patient => fetchImageBlobURL(patient.picture));

  const imageUrls = await Promise.all(imagePromises);

  filtered.forEach((patient, index) => {
    const fullName = patient.nom;
    const imgSrc = imageUrls[index];

    const card = document.createElement("div");
    card.className = "user-card";
    card.setAttribute("tabindex", "0");
    card.style.cursor = "pointer";

    card.innerHTML = `
      <img src="${imgSrc}" class="pfp" alt="Photo de profil de ${fullName}">
      <div class="card-body">
        <h5 class="card-title">${fullName}</h5>
      </div>
    `;

    card.addEventListener("click", () => openUserModal(patient));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUserModal(patient);
      }
    });

    container.appendChild(card);
  });
}

function setupModalFocusHandling() {
  const modalEl = document.getElementById("userModal");

  modalEl.addEventListener("hide.bs.modal", () => {
    if (modalEl.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });

  modalEl.addEventListener("hidden.bs.modal", () => {
    const container = document.getElementById("patientContainer");
    if (container) {
      container.focus();
    } else {
      document.body.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPatients();

  document.getElementById("searchInput").addEventListener("input", renderPatients);
  document.getElementById("sortSelect").addEventListener("change", renderPatients);

  setupModalFocusHandling();
});
