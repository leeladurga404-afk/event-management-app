import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
// ---------- Page elements ----------
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const messageBox = document.getElementById("message");

// While true, the "already logged in" check below is skipped,
// so it doesn't redirect before the user's Firestore document is saved.
let isSigningUp = false;

// ---------- Tab switching ----------
function showTab(which) {
  const isLogin = which === "login";
  loginForm.classList.toggle("d-none", !isLogin);
  signupForm.classList.toggle("d-none", isLogin);
  tabLogin.classList.toggle("active", isLogin);
  tabSignup.classList.toggle("active", !isLogin);
  hideMessage();
}
tabLogin.addEventListener("click", () => showTab("login"));
tabSignup.addEventListener("click", () => showTab("signup"));

// ---------- Messages ----------
function showMessage(text, type = "danger") {
  messageBox.textContent = text;
  messageBox.className = `alert alert-${type}`;
}
function hideMessage() {
  messageBox.className = "alert d-none";
}

function friendlyError(code) {
  const errors = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a bit and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection."
  };
  return errors[code] || "Something went wrong. Please try again.";
}

// ---------- Redirect based on role ----------
async function redirectByRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const role = snap.exists() ? snap.data().role : "student";
  window.location.href = role === "admin" ? "admin.html" : "events.html";
}

// ---------- Sign up ----------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const btn = document.getElementById("signupBtn");

  btn.disabled = true;
  btn.textContent = "Creating account...";
  isSigningUp = true;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Save the user's profile; document ID = their uid
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role: "student",
      createdAt: serverTimestamp()
    });

    window.location.href = "events.html";
  } catch (err) {
    console.error(err);
    showMessage(friendlyError(err.code));
    isSigningUp = false;
    btn.disabled = false;
    btn.textContent = "Create account";
  }
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginBtn");

  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await redirectByRole(cred.user.uid);
  } catch (err) {
    console.error(err);
    showMessage(friendlyError(err.code));
    btn.disabled = false;
    btn.textContent = "Login";
  }
});
// ---------- Forgot password ----------
document.getElementById("forgotLink").addEventListener("click", async (e) => {
  e.preventDefault();
  hideMessage();

  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    showMessage("Type your email in the Email box first, then click Forgot password.", "warning");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.", "success");
  } catch (err) {
    console.error(err);
    showMessage(friendlyError(err.code));
  }
});
// ---------- Already logged in? Skip this page ----------
onAuthStateChanged(auth, (user) => {
  if (user && !isSigningUp) {
    redirectByRole(user.uid);
  }
});