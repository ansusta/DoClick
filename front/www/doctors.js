import { URL as API_BASE_URL, loadRemoteURL } from './config.js';

let doctors = [];
async function fetchDoctors() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/doctors`, {
            headers: {
              "ngrok-skip-browser-warning": "true"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch doctors");
        }
        const data = await response.json();
        console.log("Fetched data:", data); 
        doctors = data.doctors; 
        console.log("Doctors array:", doctors); 
        filterDoctorsFromURL();
    } catch (error) {
        console.error("Error fetching doctors:", error);
        document.getElementById("doctorsList").innerHTML = "<p>Error loading doctors. Please try again later.</p>";
    }
}


function loadDoctors(filteredDoctors = doctors) {
    const doctorsList = document.getElementById("doctorsList");
    doctorsList.innerHTML = "";
    console.log("Loading doctors:", filteredDoctors);
    filteredDoctors.forEach(doctor => {
        let doctorCard = document.createElement("div");
        doctorCard.className = "doctor-card";
        doctorCard.innerHTML = `
            <i class="fas fa-user-md"></i>
            <div>
                <h5>Dr. ${doctor.nom}</h5> 
                <p>${doctor.specialite} - ${doctor.diplome} - ${doctor.numTel}</p>
            </div>
        `;
        doctorCard.setAttribute("data-bs-toggle", "modal");
        doctorCard.setAttribute("data-bs-target", "#doctorModal");
        doctorCard.onclick = () => showDoctorDetails(doctor);
        doctorsList.appendChild(doctorCard);
    });
if (filteredDoctors.length === 1 && getQueryParams().id) {
    showDoctorDetails(filteredDoctors[0]);

    const modal = new bootstrap.Modal(document.getElementById('doctorModal'));
    modal.show();
}


}

function stripDrPrefix(name) {
    return name.replace(/^Dr\.?\s*/i, ''); 
}

function filterDoctors() {
    console.log("Filter triggered!");
    let searchValue = document.getElementById("searchBar").value.toLowerCase();
    let specialite = document.getElementById("filterSpeciality").value;
    let sortBy = document.getElementById("sortByName").value;
    console.log("Search value:", searchValue);
    console.log("Speciality filter:", specialite);
    console.log("Sort by:", sortBy);

    let filteredDoctors = doctors.filter(doctor =>
        (doctor.nom.toLowerCase().includes(searchValue) || doctor.specialite.toLowerCase().includes(searchValue)) &&
        (specialite === "" || doctor.specialite.toLowerCase() === specialite.toLowerCase())
    );

    console.log("Filtered doctors:", filteredDoctors);

    filteredDoctors.sort((a, b) => {
        return sortBy === "asc"
            ? stripDrPrefix(a.nom).localeCompare(stripDrPrefix(b.nom))
            : stripDrPrefix(b.nom).localeCompare(stripDrPrefix(a.nom));
    });

    loadDoctors(filteredDoctors);
}

async function showDoctorDetails(doctor) {
    await loadRemoteURL();
    const role = window.userRole;

    const actionButton = role === "admin"
        ? `<a href="editDoctor.html?id=${doctor.idMedecin}" class="btn btn-warning">modifier infos</a> 
           <a href="reserver.html?id=${doctor.idMedecin}" class="btn btn-primary">voir plus</a>`
        : `<a href="reserver.html?id=${doctor.idMedecin}" class="btn btn-primary">Réserver</a>`;

    let imageBlobURL = '';
    try {
        const response = await fetch(`${API_BASE_URL}${doctor.picture}`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (!response.ok) {
            throw new Error("Image fetch failed");
        }
        const blob = await response.blob();
        imageBlobURL = URL.createObjectURL(blob);
    } catch (err) {
        console.warn("Could not load image from ngrok. Using fallback.", err);
        imageBlobURL = 'rs/doctor.jpg';
    }

    document.getElementById("doctorModalLabel").textContent = `Dr. ${doctor.nom}`; 
    document.getElementById("doctorModalBody").innerHTML = `
        <img src="${imageBlobURL}" alt="Doctor Image" class="img-fluid mb-3 doctor-profile-img" />
        <p><strong>Specialité:</strong> ${doctor.specialite}</p>
        <p><strong>numero telephone:</strong> ${doctor.numTel}</p>
        <p><strong>diplome:</strong> ${doctor.diplome}</p>
    `;
    document.querySelector("#doctorModal .modal-footer").innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">fermer</button>
        ${actionButton}
    `;
}


function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const queryParams = {
        id: params.get("id") || "",
        specialite: params.get("specialite") || "",
        search: params.get("search") || ""
    };
    console.log("Query parameters:", queryParams); 
    return queryParams;
}


function filterDoctorsFromURL() {
    const { id, specialite, search } = getQueryParams();
    console.log("Filtering doctors from URL with params - ID:", id, "Speciality:", specialite, "Search:", search);

    let filteredDoctors;

    if (id) {
        filteredDoctors = doctors.filter(doctor => doctor.idMedecin.toString() === id);
    } else {
        // Otherwise, apply normal filters
        filteredDoctors = doctors.filter(doctor =>
            (search === "" || doctor.nom.toLowerCase().includes(search.toLowerCase()) || doctor.specialite.toLowerCase().includes(search.toLowerCase())) &&
            (specialite === "" || doctor.specialite.toLowerCase() === specialite.toLowerCase())
        );
    }

    console.log("Filtered doctors from URL:", filteredDoctors);
    loadDoctors(filteredDoctors);
}


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

function resetFilters() {
    document.getElementById("searchBar").value = "";
    document.getElementById("filterSpeciality").value = "";
    document.getElementById("sortByName").value = "asc";
    loadDoctors(doctors);
}

async function init() {
    await loadRemoteURL();

    const token = localStorage.getItem("auth_token");
    const decoded = decodeJWT(token);
    window.userRole = decoded?.role;

    if (userRole === "admin") {
        const home = document.getElementById("goBack");
        const navbar = document.querySelector('.bottom-nav');
        if (navbar) {
            navbar.style.display = 'none';
        }
        if (home) {
            home.href = "adminDashboard.html";
        }
    }

    await fetchDoctors();
    document.getElementById("searchBar").addEventListener("input", filterDoctors);
    document.getElementById("searchBar").addEventListener("dblclick", resetFilters);
    document.getElementById("filterSpeciality").addEventListener("change", filterDoctors);
    document.getElementById("filterSpeciality").addEventListener("dblclick", resetFilters);
    document.getElementById("sortByName").addEventListener("change", filterDoctors);
    document.getElementById("sortByName").addEventListener("dblclick", resetFilters);
}

document.addEventListener("DOMContentLoaded", init);
