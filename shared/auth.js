import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const getFirebaseConfig = () => window.RUGATHA_FIREBASE_CONFIG || null;

const ensureAuthStyles = () => {
  if (document.getElementById("rugatha-auth-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "rugatha-auth-style";
  style.textContent = `
    .auth-entry {
      position: static;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      margin: 32px auto 24px;
      padding: 0 16px;
      text-align: center;
      justify-self: center;
      align-self: center;
      grid-column: 1 / -1;
      font-family: "Space Grotesk", "Inter", system-ui, -apple-system, sans-serif;
    }

    .auth-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #1a1a1a;
      font-weight: 700;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .auth-button:hover,
    .auth-button:focus-visible {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
      outline: none;
    }

    .auth-button:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .auth-icon {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      background: #fff;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    }

    .auth-status {
      font-size: 13px;
      color: #f0f5f2;
      font-weight: 600;
      text-align: center;
      max-width: 240px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    }

    @media (max-width: 720px) {
      .auth-status {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
};

const ensureAuthMarkup = () => {
  if (document.getElementById("google-login")) {
    return;
  }

  const container = document.createElement("section");
  container.className = "auth-entry";
  container.setAttribute("aria-label", "Account");
  container.innerHTML = `
    <button class="auth-button" id="google-login" type="button" aria-label="Sign in with Google">
      <span class="auth-icon" aria-hidden="true">
        <svg viewBox="0 0 256 262" width="18" height="18" role="presentation" focusable="false">
          <path fill="#4285F4" d="M255.9 133.5c0-11.1-.9-22.5-2.9-33.5H130v63.4h70.3c-3 16.1-12.2 30.1-25.9 39.4v32.6h41.8c24.5-22.6 39.7-56.1 39.7-101.9z"/>
          <path fill="#34A853" d="M130 261.1c35.1 0 64.6-11.6 86.2-31.5l-41.8-32.6c-11.6 7.8-26.5 12.4-44.4 12.4-34.1 0-63-23-73.3-53.8H13.6v33.8C35.4 230.6 79.9 261.1 130 261.1z"/>
          <path fill="#FBBC05" d="M56.7 155.6c-2.7-8.1-4.2-16.8-4.2-25.6s1.6-17.5 4.2-25.6V70.6H13.6C4.9 88.2 0 108.1 0 130s4.9 41.8 13.6 59.4l43.1-33.8z"/>
          <path fill="#EA4335" d="M130 51.9c19.1 0 36.3 6.6 49.8 19.6l37.3-37.3C194.5 12.7 165.1 0 130 0 79.9 0 35.4 30.5 13.6 70.6l43.1 33.8C67 74.9 95.9 51.9 130 51.9z"/>
        </svg>
      </span>
      <span class="auth-label">Sign in</span>
    </button>
    <div class="auth-status" id="auth-status" aria-live="polite">Google login</div>
  `;
  const host =
    document.querySelector(".page") ||
    document.querySelector("main") ||
    document.querySelector(".container") ||
    document.body;
  host.appendChild(container);
};

const setupAuth = () => {
  ensureAuthStyles();
  ensureAuthMarkup();

  const loginButton = document.getElementById("google-login");
  const statusEl = document.getElementById("auth-status");

  if (!loginButton || !statusEl) {
    return;
  }

  const labelEl = loginButton.querySelector(".auth-label");
  const firebaseConfig = getFirebaseConfig();
  const firebaseDisabled =
    window.RUGATHA_FEATURE_FLAGS && window.RUGATHA_FEATURE_FLAGS.firebaseEnabled === false;

  if (firebaseDisabled || !firebaseConfig) {
    if (labelEl) {
      labelEl.textContent = "Sign in";
    }
    statusEl.textContent = firebaseDisabled ? "Firebase disabled" : "Missing Firebase config";
    loginButton.disabled = true;
    loginButton.setAttribute("aria-disabled", "true");
    if (!firebaseDisabled) {
      console.warn("Missing window.RUGATHA_FIREBASE_CONFIG");
    }
    return;
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {});

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const setSignedOut = () => {
    if (labelEl) {
      labelEl.textContent = "Sign in";
    }
    statusEl.textContent = "Google login";
    loginButton.disabled = false;
    loginButton.removeAttribute("aria-disabled");
  };

  const setSignedIn = (user) => {
    if (labelEl) {
      labelEl.textContent = "Signed in";
    }
    const fallback = user?.email || "Signed in";
    statusEl.textContent = user?.displayName ? `Hi, ${user.displayName}` : fallback;
    loginButton.disabled = true;
    loginButton.setAttribute("aria-disabled", "true");
  };

  loginButton.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed", error);
      statusEl.textContent = "Sign-in failed";
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setSignedIn(user);
      return;
    }
    setSignedOut();
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupAuth);
} else {
  setupAuth();
}
