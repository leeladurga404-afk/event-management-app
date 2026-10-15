import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  collection, doc, getDoc, onSnapshot, query, orderBy, where,
  runTransaction, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ---------- Page elements ----------
const loading = document.getElementById("loading");
const app = document.getElementById("app");
const eventList = document.getElementById("eventList");
const myList = document.getElementById("myList");
const emptyAll = document.getElementById("emptyAll");
const emptyMine = document.getElementById("emptyMine");
const toastBox = document.getElementById("toastBox");

let currentUser = null;
let currentProfile = null;
let events = [];            // all events from Firestore
let myRegs = new Map();     // eventId -> registration data (this student's only)

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function showToast(text, type = "success") {
  toastBox.textContent = text;
  toastBox.className = `alert alert-${type}`;
  setTimeout(() => toastBox.classList.add("d-none"), 3500);
}

// ---------- Login check ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  const snap = await getDoc(doc(db, "users", user.uid));
  currentProfile = snap.exists() ? snap.data() : { name: user.displayName || "Student", role: "student" };

  document.getElementById("userName").textContent = currentProfile.name;
  if (currentProfile.role === "admin") {
    document.getElementById("adminLinkItem").classList.remove("d-none");
  }

  loading.classList.add("d-none");
  app.classList.remove("d-none");
  listenToEvents();
  listenToMyRegistrations();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ---------- Tabs ----------
const tabAll = document.getElementById("tab-all");
const tabMine = document.getElementById("tab-mine");
function showTab(which) {
  const isAll = which === "all";
  document.getElementById("allSection").classList.toggle("d-none", !isAll);
  document.getElementById("mineSection").classList.toggle("d-none", isAll);
  tabAll.classList.toggle("active", isAll);
  tabMine.classList.toggle("active", !isAll);
}
tabAll.addEventListener("click", () => showTab("all"));
tabMine.addEventListener("click", () => showTab("mine"));

// ---------- Live data ----------
function listenToEvents() {
  const q = query(collection(db, "events"), orderBy("date"));
  onSnapshot(q, (snapshot) => {
    events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error(err);
    showToast("Could not load events.", "danger");
  });
}

function listenToMyRegistrations() {
  const q = query(collection(db, "registrations"), where("userId", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    myRegs = new Map();
    snapshot.forEach((d) => myRegs.set(d.data().eventId, { id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error(err);
    showToast("Could not load your registrations.", "danger");
  });
}

// ---------- Drawing the page ----------
function todayString() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function render() {
  const today = todayString();

  // All events
  eventList.innerHTML = events.map((e) => {
    const registered = myRegs.has(e.id);
    const taken = e.registeredCount || 0;
    const left = e.capacity - taken;
    const isPast = e.date < today;

    let button;
    if (registered) {
      button = `<button class="btn btn-outline-danger w-100" data-action="cancel" data-id="${e.id}">Cancel Registration</button>`;
    } else if (isPast) {
      button = `<button class="btn btn-secondary w-100" disabled>Event Ended</button>`;
    } else if (left <= 0) {
      button = `<button class="btn btn-secondary w-100" disabled>Event Full</button>`;
    } else {
      button = `<button class="btn btn-primary w-100" data-action="register" data-id="${e.id}">Register</button>`;
    }

    const badge = registered ? `<span class="badge bg-success ms-2">Registered</span>` : "";
    const spots = left <= 0 ? "No spots left" : `${left} of ${e.capacity} spots left`;

    return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(e.title)}${badge}</h5>
            <p class="mb-1">📅 ${escapeHtml(e.date)} at ${escapeHtml(e.time)}</p>
            <p class="mb-1">📍 ${escapeHtml(e.venue)}</p>
            <p class="mb-2">👥 ${spots}</p>
            <p class="card-text text-muted">${escapeHtml(e.description)}</p>
          </div>
          <div class="card-footer bg-white">${button}</div>
        </div>
      </div>`;
  }).join("");
  emptyAll.classList.toggle("d-none", events.length > 0);

  // My registrations
  const mine = [...myRegs.values()].sort((a, b) => (a.eventDate || "").localeCompare(b.eventDate || ""));
  myList.innerHTML = mine.map((r) => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(r.eventTitle)}</h5>
          <p class="mb-1">📅 ${escapeHtml(r.eventDate)} at ${escapeHtml(r.eventTime)}</p>
          <p class="mb-0">📍 ${escapeHtml(r.eventVenue)}</p>
        </div>
        <div class="card-footer bg-white">
          <button class="btn btn-outline-danger w-100" data-action="cancel" data-id="${r.eventId}">Cancel Registration</button>
        </div>
      </div>
    </div>`).join("");
  emptyMine.classList.toggle("d-none", mine.length > 0);
  document.getElementById("myCount").textContent = mine.length;
}

// ---------- Button clicks ----------
document.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;
  const eventId = btn.dataset.id;
  btn.disabled = true;

  try {
    if (btn.dataset.action === "register") {
      await registerForEvent(eventId);
      showToast("You're registered! 🎉");
    } else {
      if (!confirm("Cancel your registration for this event?")) {
        btn.disabled = false;
        return;
      }
      await cancelRegistration(eventId);
      showToast("Registration cancelled.", "info");
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Something went wrong. Try again.", "danger");
    btn.disabled = false;
  }
});

// ---------- Register (safe transaction) ----------
async function registerForEvent(eventId) {
  const eventRef = doc(db, "events", eventId);
  const regRef = doc(db, "registrations", `${eventId}_${currentUser.uid}`);

  await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef);
    const regSnap = await tx.get(regRef);

    if (!eventSnap.exists()) throw new Error("This event no longer exists.");
    if (regSnap.exists()) throw new Error("You are already registered.");

    const e = eventSnap.data();
    if (e.date < todayString()) throw new Error("This event has already ended.");
    if ((e.registeredCount || 0) >= e.capacity) throw new Error("Sorry, this event is full.");

    tx.set(regRef, {
      eventId,
      userId: currentUser.uid,
      userName: currentProfile.name,
      userEmail: currentUser.email,
      eventTitle: e.title,
      eventDate: e.date,
      eventTime: e.time,
      eventVenue: e.venue,
      registeredAt: serverTimestamp()
    });
    tx.update(eventRef, { registeredCount: increment(1) });
  });
}

// ---------- Cancel (safe transaction) ----------
async function cancelRegistration(eventId) {
  const eventRef = doc(db, "events", eventId);
  const regRef = doc(db, "registrations", `${eventId}_${currentUser.uid}`);

  await runTransaction(db, async (tx) => {
    const regSnap = await tx.get(regRef);
    if (!regSnap.exists()) throw new Error("Registration not found.");
    tx.delete(regRef);
    tx.update(eventRef, { registeredCount: increment(-1) });
  });
}