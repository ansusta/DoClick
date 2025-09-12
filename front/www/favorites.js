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

$(document).ready(async function() {
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
    const patientId = decoded.id;
    fetch(`${URL}/api/favorites?id=${patientId}`,{
                    headers: {
              "ngrok-skip-browser-warning": "true"
            }
    })
        .then(response => response.json())
        .then(data => {
            const favoritesContainer = $('#favorites-container');
            if (data.favorites && data.favorites.length > 0) {
                data.favorites.forEach(doctor => {
                    const doctorCard = `
                      <div class="card doctor-card p-3 d-flex flex-row align-items-center" data-id="${doctor.idMedecin}">
                        <img
                          src="${doctor.picture || 'https://via.placeholder.com/64'}"
                          class="doctor-img me-3"
                          alt="${doctor.nom}"
                        />
                        <div class="doctor-info">
                          <h6 class="mb-0">${doctor.nom}</h6>
                          <small class="text-muted">${doctor.specialite}</small>
                        </div>
                        <i class="fa-solid fa-heart fa-lg heart-icon"></i>
                      </div>
                    `;
                    favoritesContainer.append(doctorCard);
                });
                $('.doctor-card').on('click', function() {
                    const doctorId = $(this).data('id');
                    window.location.href = `reserver.html?id=${doctorId}`;
                });
                $('.heart-icon').on('click', function(e) {
                    e.stopPropagation();
                    const doctorId = $(this).closest('.doctor-card').data('id');
                    console.log(`Heart clicked for doctor ID: ${doctorId}`);
                });

            } else {
                favoritesContainer.html('<p>No favorite doctors found.</p>');
            }
        })
        .catch(error => {
            console.error('Error fetching favorites:', error);
            $('#favorites-container').html('<p>Error loading favorite doctors.</p>');
        });
});
