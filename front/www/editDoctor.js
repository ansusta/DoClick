import { URL, loadRemoteURL } from './config.js';


const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");

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
async function loadDoctorInfo() {
    await loadRemoteURL();
      const authorized = await checkAuthorization();
  if (!authorized) return;

  const res = await fetch(`${URL}/api/doctors/${id}`,{
    headers:{
      "ngrok-skip-browser-warning": "true"
    }
  });
  const data = await res.json();
  const doctor = data.doctor;
  document.getElementById("nom").value = doctor.nom;
  document.getElementById("specialite").value = doctor.specialite;
  document.getElementById("numTel").value = doctor.numTel;
  document.getElementById("diplome").value = doctor.diplome;
}
function toggleField(id) {
  const field = document.getElementById(id);
  field.readOnly = !field.readOnly;
  if (!field.readOnly) field.focus();
}
function toggleImage() {
  const imageInput = document.getElementById("image");
  imageInput.disabled = !imageInput.disabled;
}
document.getElementById("editDoctorForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const nom = document.getElementById("nom").value;
  const specialite = document.getElementById("specialite").value;
  const numTel = document.getElementById("numTel").value;
  const diplome = document.getElementById("diplome").value;
  const imageFile = document.getElementById("image").files[0];
  let imageUrl = null;
  if (imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);
    const uploadRes = await fetch(`${URL}/api/upload-profile-pic` , {
      headers:{
        "ngrok-skip-browser-warning": "true"
      },
      method: "POST",
      body: formData,
      
    });
    if (!uploadRes.ok) {
      alert("Échec de l'envoi de l'image");
      return;
    }
    const uploadData = await uploadRes.json();
    imageUrl = uploadData.imageUrl;
  }
  const updatedDoctor = {
    nom,
    specialite,
    numTel,
    diplome,
    ...(imageUrl && { imageUrl })
  };
  const response = await fetch(`${URL}/api/doctors/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify(updatedDoctor),
  });

  if (response.ok) {
    alert("Médecin mis à jour avec succès !");
    window.location.href = "doctors.html";
  } else {
    alert("Échec de la mise à jour");
  }
});

loadDoctorInfo();
window.toggleField=toggleField;
window.toggleImage=toggleImage;