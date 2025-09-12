import { URL, loadRemoteURL } from './config.js';

function visibility() {
    const togglePasswordBtn = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", function () {
            const icon = this.querySelector("i");
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });
    }
}

function showToast(message) {
    const toastEl = document.getElementById('errorToast');
    if (!toastEl) return;
    document.getElementById('toastMessage').textContent = message;
    new bootstrap.Toast(toastEl).show();
}


async function init() {
    await loadRemoteURL();

    visibility();

    document.getElementById("signupForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const form = e.currentTarget;
        form.classList.remove('was-validated');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');

        const credential = document.getElementById("credential").value.trim();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const birthdate = document.getElementById("birthdate").value;

        const validationErrors = validateInputs({ credential, username, password, birthdate });
        
        if (Object.keys(validationErrors).length > 0) {
            Object.entries(validationErrors).forEach(([fieldId, message]) => showError(fieldId, message));
            form.classList.add('was-validated');
            return;
        }

        try {
            const response = await fetch(`${URL}/api/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify({ credential, username, password, birthdate })
            });

            const result = await response.json();
            console.log("Signup response:", result);


           if (!response.ok) {
    if (result.errors) {
        result.errors.forEach(error => showError(error.param, error.msg));
        form.classList.add('was-validated');
    } else if (result.error) {
        showToast(result.error); 
    }
    return;
}



            window.location.href = "/Login.html";

        } catch (error) {
            console.error("Signup error:", error);
            showToast("Une erreur s'est produite lors de l'inscription. Veuillez réessayer..");
        }

        function validateInputs({ credential, username, password, birthdate }) {
            const errors = {};
        
            if (!credential) {
                errors.credential = "L'adresse e-mail ou le numéro de téléphone est requis";
            } else if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential) &&
                !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(credential)
            ) {
                errors.credential = "Veuillez saisir une adresse e-mail ou un numéro de téléphone valide";
            }
        
            if (!username) {
                errors.username = "Le nom d'utilisateur est requis";
            }
        
            if (!password) {
                errors.password = "Le mot de passe est requis";
            } else if (password.length < 6) {
                errors.password = "Le mot de passe doit comporter au moins 6 caractères";
            } else if (!/\d/.test(password)) {
                errors.password = "Le mot de passe doit contenir au moins un chiffre";
            }
        
            if (!birthdate) {
                errors.birthdate = "La date de naissance est obligatoire";
            } else {
                const age = calculateAge(new Date(birthdate));
                if (age < 18) {
                    errors.birthdate = "Vous devez avoir au moins 18 ans pour vous inscrire";
                }
            }
        
            return errors;
        }
        
        function calculateAge(birthdate) {
            const today = new Date();
            let age = today.getFullYear() - birthdate.getFullYear();
            const m = today.getMonth() - birthdate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
                age--;
            }
            return age;
        }
        

        function showError(fieldId, message) {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(`${fieldId}Error`);
            if (field && errorElement) {
                field.classList.add('is-invalid');
                errorElement.textContent = message;

                field.addEventListener("input", function () {
                    field.classList.remove("is-invalid");
                    errorElement.textContent = "";
                }, { once: true });
            }
        }

        function showToast(message) {
            const toastEl = document.getElementById('errorToast');
            if (!toastEl) return;
            document.getElementById('toastMessage').textContent = message;
            new bootstrap.Toast(toastEl).show();
        }
    });
}

document.addEventListener("DOMContentLoaded", init);
