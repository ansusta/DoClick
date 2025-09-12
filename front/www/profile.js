import { URL as API_BASE_URL, loadRemoteURL } from './config.js';

let user = null;

window.onload = async function () {
    await loadRemoteURL();
    console.log("Window loaded.");

    const authToken = localStorage.getItem("auth_token");
    if (!authToken) {
        console.warn("No auth token found. Redirecting...");
        window.location.href = "/Login.html";
        return;
    }

    const decoded = decodeJWT(authToken);
    const editProfileBtn = document.getElementById("editProfileBtn");

    if (decoded && decoded.id) {
        const userId = decoded.id;
        if (editProfileBtn) editProfileBtn.style.display = "block";

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (!response.ok) throw new Error("User not found");

            user = await response.json();
            document.getElementById("userName").textContent = user.nom || "Unknown";
            document.getElementById("userEmail").textContent = user.contact_info || "No contact info";

            let profileImgUrl = "";
            try {
                const imgRes = await fetch(`${API_BASE_URL}${user.picture}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });

                if (!imgRes.ok) throw new Error("Image fetch failed");

                const blob = await imgRes.blob();
                profileImgUrl = window.URL.createObjectURL(blob);
            } catch (err) {
                console.warn("Failed to load profile image. Using fallback.", err);
                profileImgUrl = 'https://via.placeholder.com/150?text=User';
            }

            document.querySelector(".profile-img").src = profileImgUrl;

        } catch (error) {
            console.error("Error fetching user:", error);
            document.getElementById("profileSection").innerHTML = "<p class='text-danger'>Failed to load user profile.</p>";
        }
    } else {
        console.warn("No valid user ID in token.");
    }
};

function mesReservations(){
   window.location.href="patientReservation.html"
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
function logout(){
    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn.addEventListener("click", function() {
        localStorage.removeItem("auth_token");
        window.location.href = "Login.html";
    });
}
function editProfile() {
    const currentName = user?.nom || "";
    const currentPic = user?.picture || "rs/user.jpg";

    document.getElementById("newName").value = currentName;
    document.getElementById("previewImg").src = currentPic;
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();

document.getElementById("newProfilePic").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
        document.getElementById("previewImg").src = window.URL.createObjectURL(file);
    }
});


    // Handle submit
    document.getElementById("editProfileForm").onsubmit = async function (e) {
        e.preventDefault();
        const authToken = localStorage.getItem("auth_token");
        const decoded = decodeJWT(authToken);
        if (!decoded || !decoded.id) return;

        const idUtilisateur = decoded.id;
        const newName = document.getElementById("newName").value;
        const fileInput = document.getElementById("newProfilePic");
        let uploadedImageURL = user.picture; // default to current

        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("image", fileInput.files[0]);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/api/upload-profile-pic`, {
                    method: "POST",
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadRes.ok) {
                    uploadedImageURL = uploadData.imageUrl;
                } else {
                    alert("Échec du téléchargement de l'image");
                }
            } catch (err) {
                console.error("Upload error:", err);
            }
        }

        try {
            const updateRes = await fetch(`${API_BASE_URL}/api/updateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify({
                    idUtilisateur: idUtilisateur,
                    nom: newName,
                    picture: uploadedImageURL
                })
            });
            const result = await updateRes.json();
            if (updateRes.ok) {
                user.nom = newName;
                user.picture = uploadedImageURL;
                document.querySelector(".userName").textContent = newName;
                document.querySelector(".profile-img").src = uploadedImageURL;
                bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
            } else {
                alert("Erreur lors de la mise à jour du profil");
            }
        } catch (error) {
            console.error("Profile update error:", error);
        }
    };
}

window.editProfile = editProfile;
window.logout=logout;
window.mesReservations=mesReservations;

