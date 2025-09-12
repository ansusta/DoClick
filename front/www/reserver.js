import { URL, loadRemoteURL } from './config.js';

function decodeJWT(token) {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadRemoteURL();
    const doctorId = new URLSearchParams(window.location.search).get("id");
    const token = localStorage.getItem("auth_token");
    const decoded = decodeJWT(token);
    window.userRole = decoded?.role;
    const bookButton = document.getElementById("book-appointment-btn");
    if (window.userRole === "admin" && bookButton) {
        bookButton.style.display = "none";
    }
    const moreOptionsBtn = document.getElementById("more-options-btn");
    const optionsMenu = document.getElementById("options-menu");
    const favoriteBtn = document.getElementById("favorite-btn");
    const editBtn = document.getElementById("edit-btn");
    const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    document.getElementById("editLink").href = `planning.html?id=${id}`;
  } else {
    document.getElementById("editLink").href = "planning.html";
  }
    if (moreOptionsBtn) {
        function positionMenu() {
            const rect = moreOptionsBtn.getBoundingClientRect();
            optionsMenu.style.top = `${rect.bottom + window.scrollY}px`;
            optionsMenu.style.left = `${rect.left + window.scrollX - 100}px`;
        }
        let isFavorited = false;
        if (window.userRole === "patient") {
            favoriteBtn.style.display = "block";
            await checkIfFavorited();
        }
        
           async function checkIfFavorited() {
              try {

           const response = await fetch(`${URL}/api/favorites/is-favorited?idUtilisateur=${decoded.id}&idMedecin=${doctorId}`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
          });
          const data = await response.json();
          isFavorited = data.isFavorited;
             updateFavoriteButton();
                } catch (err) {
            console.error("Erreur lors de la vérification des favoris:", err);
    }
}

function updateFavoriteButton() {
    favoriteBtn.innerHTML = isFavorited 
        ? '<i class="fas fa-heart-broken me-1"></i> défavoris'
        : '<i class="fas fa-heart me-1"></i> ajouter aux Favorites';
}

favoriteBtn.addEventListener("click", async () => {
    const endpoint = `${URL}/api/favorite`;
    const options = {
        method: isFavorited ? "DELETE" : "POST",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
            idUtilisateur: decoded.id,
            idMedecin: doctorId
        })
    };

    try {
        const response = await fetch(endpoint + (isFavorited ? `?idUtilisateur=${decoded.id}&idMedecin=${doctorId}` : ''), options);
        if (response.ok) {
            isFavorited = !isFavorited;
            updateFavoriteButton();
            alert(isFavorited ? "Ajouté aux favoris !" : "Retiré des favoris !");
            optionsMenu.style.display = "none";
        } else {
            const error = await response.json();
            alert(error.message || "Erreur !");
        }
    } catch (err) {
        console.error("Erreur lors du traitement des favoris :", err);
        alert("Erreur serveur !");
    }
});

          if (window.userRole === "admin") {
            editBtn.style.display = "block";
            editBtn.addEventListener("click", () => {
                alert("Edit doctor information");
                optionsMenu.style.display = "none";
            });
        }
        moreOptionsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            positionMenu();
            optionsMenu.style.display = optionsMenu.style.display === "none" ? "block" : "none";
        });
        document.addEventListener("click", () => {
            optionsMenu.style.display = "none";
        });
    }

    if (!doctorId) {
        alert("Aucun médecin spécifié !");
        return;
    }

    try {
        const response = await fetch(`${URL}/api/doctors/${doctorId}`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        const data = await response.json();
        if (response.ok && data.doctor) {
            const doctor = data.doctor;
            document.getElementById("doctor-img").src = doctor.picture || "default.jpg";
            document.getElementById("doctor-name").textContent = "Dr. " + doctor.nom;
            document.getElementById("doctor-specialty").textContent = doctor.specialite;
            document.getElementById("doctor-degree").textContent = `Formation : ${doctor.diplome}`;
            document.getElementById("doctor-phone").textContent = `Téléphone : ${doctor.numTel}`;
            try {
                const favResponse = await fetch(`${URL}/api/favorites/count?id=${doctorId}`, {
                    headers: {
                        "ngrok-skip-browser-warning": "true"
                    }
                });
                const favData = await favResponse.json();
                const count = (Array.isArray(favData.favoritesCount) && favData.favoritesCount.length > 0)
                    ? favData.favoritesCount[0].totalFavorites
                    : 0;
                document.getElementById("doctor-favorites").textContent = count;
            } catch (err) {
                console.error("Erreur lors de la récupération des favoris:", err);
                document.getElementById("doctor-favorites").textContent = "0";
            }
            

            const planningResponse = await fetch(`${URL}/api/planning/${doctorId}`, {
                headers: {
                    "ngrok-skip-browser-warning": "true"
                }
            });
            const planningData = await planningResponse.json();
            if (planningResponse.ok && Array.isArray(planningData) && planningData.length > 0) {
                const events = planningData.map(slot => ({
                    id: `${slot.date}T${slot.temps}`, 
                    title: "Disponible",
                    start: `${slot.date}T${slot.temps}`,
                    allDay: false,
                    backgroundColor: "#28a745",
                    borderColor: "#28a745"
                }));

                const calendarEl = document.getElementById('calendar');
                let selectedEventId = null;

                const calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    locale: 'fr',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    events: events,
                    eventClick: (info) => {
                        if (selectedEventId === info.event.id) {
                            selectedEventId = null;
                            info.event.setProp('backgroundColor', '#28a745');
                            bookButton.disabled = true;
                        } else {
                            if (selectedEventId) {
                                const prevEvent = calendar.getEventById(selectedEventId);
                                if (prevEvent) prevEvent.setProp('backgroundColor', '#28a745');
                            }
                            selectedEventId = info.event.id;
                            info.event.setProp('backgroundColor', '#ffc107'); 
                            bookButton.disabled = false;
                        }
                    }
                });
                calendar.render();
                if (bookButton) {
                    bookButton.disabled = true;
                    bookButton.addEventListener("click", async () => {
                        if (!selectedEventId) {
                            alert("Veuillez sélectionner un créneau disponible dans le calendrier.");
                            return;
                        }
                        if (!decoded?.id) {
                            alert("Utilisateur non authentifié !");
                            return;
                        }
                        const dateTime = selectedEventId; 
                        const [date, time] = dateTime.split('T');
                        const heure = time.slice(0, 5); 
                        try {
                            const response = await fetch(`${URL}/api/reservations`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "ngrok-skip-browser-warning": "true"
                                },
                                body: JSON.stringify({
                                    idMedecin: doctorId,
                                    idUtilisateur: decoded.id,
                                    date,
                                    heure
                                })
                            });

                            const result = await response.json();
                            if (response.ok) {
                                alert("Réservation effectuée avec succès !");
                                const bookedEvent = calendar.getEventById(selectedEventId);
                                if (bookedEvent) {
                                    bookedEvent.remove();
                                }
                                selectedEventId = null;
                                bookButton.disabled = true;
                            } else {
                                alert(result.error || "Erreur lors de la réservation.");
                            }
                        } catch (err) {
                            console.error("Erreur lors de la réservation :", err);
                            alert("Erreur serveur.");
                        }
                    });
                }
            } else {
                alert("Aucune disponibilité trouvée pour ce médecin.");
            }
        } else {
            alert(data.error || "Erreur lors du chargement du médecin.");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du médecin :", error);
        alert("Erreur serveur !");
    }
});
