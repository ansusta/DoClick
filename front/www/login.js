import { URL, loadRemoteURL } from './config.js';
function storeToken(token) {
    try {
        console.log("Storing token:", token);
        localStorage.setItem("auth_token", token);
        const result = localStorage.getItem("auth_token");
        console.log("Stored token:", result);
        if (result !== token) {
            throw new Error("Token verification failed");
        }
    } catch (error) {
        console.error("Token storage failed:", error);
        localStorage.removeItem("auth_token");
        throw error;
    }
}
function decodeJWT(token) {
    try {
        console.log("Decoding JWT token:", token);
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        console.log("Decoded JWT payload:", payload);
        if (!payload.id || !payload.role) {
            console.error("JWT missing required fields");
            return null;
        }
        return payload;
    } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
    }
}

async function login(credential, password) {
    console.log("Login button clicked");
    try {
        const loginData = { credential, password };
        console.log("Sending login request with data:", loginData);
        const res = await fetch(`${URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
             }
            ,
            body: JSON.stringify(loginData),
        });
        const data = await res.json();
        console.log("Received login response:", data);

        if (!res.ok) {
            throw new Error(data.error || "Login failed");
        }

        const decoded = decodeJWT(data.token);
        if (!decoded) {
            throw new Error("Invalid token received");
        }

        storeToken(data.token);
        redirectUser(decoded.role);

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message || "Login failed. Please try again.");
        localStorage.removeItem("auth_token");
    }
}

function redirectUser(role) {
    if (!role) {
        console.error("No role found in token");
        window.location.href = "/login.html";
        return;
    }

    const routes = {
        admin: "/adminDashboard.html",
        patient: "/index.html"
    };

    const targetRoute = routes[role] || "/login.html";
    console.log(`Redirecting ${role} user to: ${targetRoute}`);
    window.location.href = targetRoute;
}

function checkAuth() {
    try {
        const token = localStorage.getItem("auth_token");
        console.log("Checking auth with token:", token);
        if (token) {
            const decoded = decodeJWT(token);
            console.log("Decoded token for auth check:", decoded);
            if (decoded && decoded.exp > Date.now() / 1000) {
                redirectUser(decoded.role);
            } else {
                localStorage.removeItem("auth_token");
            }
        }
    } catch (error) {
        console.error("Auth check failed:", error);
    }
}


function visibility(){
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
async function initLoginPage() {
        await loadRemoteURL();
        checkAuth();
        visibility();
        const loginForm = document.getElementById("loginForm");
        if (loginForm) {
            loginForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const credential = document.getElementById("credential").value;
                const password = document.getElementById("password").value;
                console.log("Login form submitted with email pr phone number:", credential, "and password:", password);
                await login(credential, password);
            });
        }
    }

document.addEventListener("DOMContentLoaded",initLoginPage)