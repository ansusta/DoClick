import { URL, loadRemoteURL } from './config.js';
function getViewContent(viewId) {
  const template = document.getElementById(`${viewId}-view`);
  return template ? template.innerHTML : `<p>View not found</p>`;
} 

function logout(){
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", function() {
      localStorage.removeItem("auth_token");
      window.location.href = "Login.html";
  });
}
    async function init(){
      await loadRemoteURL();
      async function loadDoctorStats() {
        try {
            const response = await fetch(`${URL}/api/admin/doctors/stats`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
                    "ngrok-skip-browser-warning": "true"
                }
            });
    
            const data = await response.json();
            console.log("received", data)
            if (response.ok) {
                document.getElementById("totalD").textContent = data.totalDoctors;
                document.getElementById("availableD").textContent = data.availableD;
            } else {
                console.error("Error loading doctor stats:", data.error);
            }
        } catch (error) {
            console.error("Network error loading doctor stats:", error);
        }
    }
    async function loadPatientStats() {
      try {
        console.log("Loading patient stats...");
          const response = await fetch(`${URL}/api/admin/patients/stats`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
                  "ngrok-skip-browser-warning": "true"
              }
          });
  
          const data = await response.json();
          console.log("Patient stats response:", data);
          if (response.ok) {
                  document.getElementById("totalP").textContent = data.total;
                  document.getElementById("availableP").textContent = data.active;
                  document.getElementById("bannedP").textContent = data.banned;

          } else {
              console.error("Error loading patient stats:", data.error);
          }
      } catch (error) {
          console.error("Network error loading patient stats:", error);
      }
  }

  async function loadAppointmentStats() {
    try {
      const response = await fetch(`${URL}/api/admin/appointments/stats`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
          "ngrok-skip-browser-warning": "true"
        }
      });
  
      const data = await response.json();
      console.log("data pour rendezvous", data)
      if (response.ok) {
          
          document.getElementById("totalA").textContent = data.total;
          document.getElementById("ongoingA").textContent = data.ongoing;
          document.getElementById("completedA").textContent = data.completed;
          document.getElementById("cancelledA").textContent = data.cancelled;
        }
      
    } catch (err) {
      console.error("Network error loading appointment stats:", err);
    }
  }

  async function loadTopDoctorStats() {
    console.log("▶️ Starting loadTopDoctorStats...");
    try {
      const token = localStorage.getItem("auth_token");
      console.log("🔐 Token:", token);
  
      const response = await fetch(`${URL}/api/admin/doctors/top`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        }
      });
  
      console.log("📥 Response status:", response.status);
      const data = await response.json();
      console.log("📊 Top Doctors List (raw):", data);
  
      const container = document.getElementById("topDoctorsList");
      console.log("🧱 Container element:", container);
  
      if (!container) {
        console.error("❌ topDoctorsList element not found in DOM");
        return;
      }
  
      if (response.ok) {
        container.innerHTML = ""; 
        if (!Array.isArray(data.topDoctors)) {
          console.error("⚠️ Unexpected data format:", data);
          return;
        }
  
        data.topDoctors.forEach((doctor, index) => {
          console.log(`👨‍⚕️ Doctor #${index + 1}:`, doctor);
  
          const item = document.createElement("div");
          item.className = "doctor-entry";
          item.innerHTML = `
          <strong>#${index + 1}</strong> - ${doctor.nom} (${doctor.specialite}) 
         <br>Reservations: ${doctor.total_reservations}
         <br><button onclick="window.location.href='doctors.html?id=${doctor.idMedecin}'">Voir</button>
         <hr>
         `;

          container.appendChild(item);
        });
      } else {
        console.error("❌ Error loading top doctor stats:", data.error || data);
      }
    } catch (error) {
      console.error("🔥 Network error loading top doctor stats:", error);
    }
  }

  
  async function loadTopCancellingUsers() {
    console.log("▶️ Starting loadTopCancellingUsers...");
    try {
      const token = localStorage.getItem("auth_token");
      console.log("🔐 Token:", token);
  
      const response = await fetch(`${URL}/api/admin/users/cancellations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        }
      });
  
      console.log("📥 Response status:", response.status);
      const data = await response.json();
      console.log("📊 Top Cancelling Users List (raw):", data);
  
      const container = document.getElementById("topCancellersList");
      console.log("🧱 Container element:", container);
  
      if (!container) {
        console.error("❌ topCancellersList element not found in DOM");
        return;
      }
  
      if (response.ok) {
        container.innerHTML = "";
        if (!Array.isArray(data.topCancellers)) {
          console.error("⚠️ Unexpected data format:", data);
          return;
        }
  
        data.topCancellers.forEach((user, index) => {
          console.log(`👤 User #${index + 1}:`, user);
          const item = document.createElement("div");
          item.className = "user-entry";
          item.innerHTML = `
          <strong>#${index + 1}</strong> - ${user.nom}
          <br>rendez_vous annuler: ${user.total_cancellations}
          <br><button onclick="window.location.href='tousUtilisateurs.html?id=${user.idUtilisateur}'">Voir</button>
          <hr>
          `;

          container.appendChild(item);
        });
      } else {
        console.error("❌ Error loading top cancelling users:", data.error || data);
      }
    } catch (error) {
      console.error("🔥 Network error loading top cancelling users:", error);
    }
  }

  async function loadLatestAppointments() {
    console.log("▶️ Starting loadLatestAppointments...");
  
    try {
      const token = localStorage.getItem("auth_token");
      console.log("🔐 Token:", token);
  
      const response = await fetch(`${URL}/api/admin/appointments/latest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        }
      });
  
      console.log("📥 Response status:", response.status);
      const data = await response.json();
      console.log("📊 Latest Appointments List (raw):", data);
  
      const container = document.getElementById("latestAppointmentsList");
      if (!container) {
        console.error("❌ latestAppointmentsList element not found in DOM");
        return;
      }
  
      if (response.ok) {
        container.innerHTML = "";
  
        if (!Array.isArray(data.latestAppointments)) {
          console.error("⚠️ Unexpected data format:", data);
          return;
        }
  
        data.latestAppointments.forEach((appt, index) => {
          console.log(`📆 Appointment #${index + 1}:`, appt);
          const item = document.createElement("div");
          item.className = "appointment-entry";
          item.innerHTML = `
            <strong>#${index + 1}</strong> - ${appt.date} a ${appt.heure}
            <br>Patient: ${appt.patient_name}
            <br>Doctor: ${appt.doctor_name}
            <br>Status: ${appt.status}
            <hr>
          `;
          container.appendChild(item);
        });
      } else {
        console.error(" Error loading latest appointments:", data.error || data);
      }
    } catch (error) {
      console.error(" Network error loading latest appointments:", error);
    }
  }
  
  
  
  
    const links = document.querySelectorAll(".nav-link[data-page]");
    const content = document.getElementById("main-content");
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      document.body.classList.toggle('sidebar-open');
    });
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('show') &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn &&
        !toggleBtn.contains(e.target)
      ) {
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      }
    });
    function setActive(link) {
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
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
     function initializeSidebar() {
        links.forEach(link => {
          link.addEventListener("click", e => {
            e.preventDefault();
            const page = link.dataset.page;
            setActive(link);
            content.innerHTML = getViewContent(page);
            if (page === "doctors") {loadDoctorStats();
              loadTopDoctorStats();
            }
            else if (page === "patients") {loadPatientStats();
              loadTopCancellingUsers();
            }
            else if(page=="appointments") {loadAppointmentStats();
              loadLatestAppointments();
            }
          });
        });
      }
      checkAuthorization();
      initializeSidebar();
      const defaultLink = document.querySelector('.nav-link[data-page="doctors"]');
  if (defaultLink) {
    defaultLink.click();
  }
  }
  document.addEventListener("DOMContentLoaded",init);
  window.logout=logout;

