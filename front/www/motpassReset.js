import { URL, loadRemoteURL } from './config.js';


async function init() {
    await loadRemoteURL();

document.getElementById("resetPasswordForm").addEventListener("submit", function(e) {
    
    e.preventDefault();

    const identifier = document.getElementById("identifier").value.trim();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const msgDiv = document.getElementById("message");

    if (newPassword !== confirmPassword) {
      msgDiv.innerHTML = `<span class="text-danger">Passwords do not match</span>`;
      return;
    }
    
    fetch(`${URL}/api/changePassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, newPassword })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        msgDiv.innerHTML = `<span class="text-success">${data.message}</span>`;
        window.location.href = "./Login.html";
      } else {
        msgDiv.innerHTML = `<span class="text-danger">${data.error}</span>`;
      }
    })
    .catch(err => {
      msgDiv.innerHTML = `<span class="text-danger">Something went wrong</span>`;
      console.error(err);
    });
  });}


  document.addEventListener("DOMContentLoaded", init);