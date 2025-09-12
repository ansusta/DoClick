 let URL = "http://localhost:5000"; // fallback/default

async function loadRemoteURL() {
  try {
    const res = await fetch("https://gist.githubusercontent.com/ansusta/fcb4a957b6660bd14cf887272d7856af/raw/ngrok-url.txt");
    if (!res.ok) throw new Error("Failed to fetch URL");
    URL = await res.text();
  } catch (err) {
    console.warn("Could not fetch remote URL. Using default.");
  }
}
export { URL, loadRemoteURL };

