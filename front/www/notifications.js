import { URL, loadRemoteURL } from './config.js';
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        return payload?.id ? payload : null;
    } catch (error) {
        console.error("Erreur lors du décodage du JWT :", error);
        return null;
    }
}
function getUserId() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.error('Aucun jeton trouvé dans le localStorage');
        return null;
    }
    const decoded = decodeJWT(token);
    return decoded?.id || null;
}

async function loadNotifications() {
    try {
        await loadRemoteURL();
        const userId = getUserId();
        if (!userId) {
            console.error('Aucun ID utilisateur disponible');
            return;
        }
        const response = await fetch(`${URL}/api/notifications/${userId}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const notifications = await response.json();
        console.log('Notifications récupérées :', notifications);
        
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        for (const notif of notifications) {
            console.log('Traitement de la notification :', notif);
            
            let isOngoing = false;
            if (notif.idRendezvous) {
                try {
                    const detailResponse = await fetch(`${URL}/api/notification/${notif.id}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    const detailData = await detailResponse.json();
                    isOngoing = detailData.rendezvous?.status === 'ongoing';
                } catch (error) {
                    console.error('Erreur lors de la vérification du statut de la notification :', error);
                }
            }

            const notifItem = document.createElement('div');
            notifItem.className = 'list-group-item d-flex justify-content-between align-items-center doctor-card mb-2';
            
            notifItem.innerHTML = `
                <div>
                    <strong>${notif.message}</strong><br>
                    <small>${notif.created_at}</small>
                </div>
                <div>
                    <button class="btn btn-success btn-sm view-btn" data-id="${notif.id}">Voir les détails</button>
                    ${isOngoing ? `<button class="btn btn-danger btn-sm cancel-btn" data-id="${notif.id}">Annuler</button>` : ''}
                </div>
            `;
            notificationsList.appendChild(notifItem);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des notifications :', error);
    }
}

async function viewDetails(notificationId) {
    try {
        console.log('Chargement des détails pour l\'ID :', notificationId);
        const response = await fetch(`${URL}/api/notification/${notificationId}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await response.json();
        console.log('Détails de la notification :', data);

        if (!response.ok) {
            console.error('Erreur du serveur :', data.error);
            alert('Erreur lors de la récupération des détails : ' + (data.error || 'Erreur inconnue'));
            return;
        }

        document.getElementById('modalMessage').innerText = data.notification.message;
        document.getElementById('modalCreatedAt').innerText = data.notification.created_at;
        document.getElementById('modalDate').innerText = data.rendezvous.date;
        document.getElementById('modalTime').innerText = data.rendezvous.heure;
        document.getElementById('modalDoctor').innerText = data.rendezvous.nomMedecin;

        new bootstrap.Modal(document.getElementById('notificationModal')).show();

    } catch (error) {
        console.error('Erreur lors de la récupération des détails :', error);
        alert('Erreur inattendue lors de la récupération des détails.');
    }
}

async function cancelNotification(notificationId) {
    console.log('Annulation de la notification ID :', notificationId);

    const confirmCancel = confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?');
    if (!confirmCancel) return;

    try {
        const response = await fetch(`${URL}/api/reservation/cancel/${notificationId}`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            }
        });

        const result = await response.json();
        console.log('Résultat de l\'annulation :', result);

        if (result.success) {
            alert('Rendez-vous annulé avec succès.');
            loadNotifications();
        } else {
            alert('Échec de l\'annulation du rendez-vous.');
        }
    } catch (error) {
        console.error('Erreur lors de l\'annulation du rendez-vous :', error);
        alert('Erreur lors de l\'annulation du rendez-vous.');
    }
}

document.getElementById('notificationsList').addEventListener('click', async (e) => {
    console.log('Élément cliqué :', e.target);

    const target = e.target.closest('button'); 
    if (!target) {
        console.log('Aucun bouton cliqué.');
        return;
    }

    const notificationId = target.dataset.id;
    console.log('Bouton cliqué avec ID :', notificationId);

    if (!notificationId) {
        console.warn('Bouton cliqué sans data-id valide');
        return;
    }

    if (target.classList.contains('view-btn')) {
        console.log('Bouton "Voir les détails" cliqué.');
        await viewDetails(notificationId);
    }

    if (target.classList.contains('cancel-btn')) {
        console.log('Bouton "Annuler" cliqué.');
        cancelNotification(notificationId);
    }
});

loadNotifications();
window.viewDetails = viewDetails;
window.cancelNotification = cancelNotification;
