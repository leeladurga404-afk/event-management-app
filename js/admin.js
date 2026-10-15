import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  collection, addDoc, doc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ---------- Page elements ----------
const loading = document.getElementById("loading");
const app = document.getElementById("app");
const eventList = document.getElementById("eventList");
const emptyMsg = document.getElementById("emptyMsg");
const form = document.getElementById("eventForm");
const formError = document.getElementById("formError");
const saveBtn = document.getElementById("saveBtn");
const modal = new bootstrap.Modal(document.getElementById("eventModal"));

let editingId = null;        // null = adding, otherwise the id of the event being edited
const eventsById = new Map(); // keeps current events so Edit can fill the form

// Prevents users from injecting HTML into the page
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Access control: admins only ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  const role = snap.exists() ? snap.data().role : "student";

  if (role !== "admin") {
    window.location.href = "events.html";
    return;
  }

  document.getElementById("userName").textContent = snap.data().name;
  loading.classList.add("d-none");
  app.classList.remove("d-none");
  listenToEvents();
});

// ---------- Logout ----------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ---------- Show events (updates live) ----------
function listenToEvents() {
  const q = query(collection(db, "events"), orderBy("date"));
  onSnapshot(q, (snapshot) => {
    eventsById.clear();
    eventList.innerHTML = "";

    snapshot.forEach((d) => {
      const e = { id: d.id, ...d.data() };
      eventsById.set(e.id, e);
      eventList.insertAdjacentHTML("beforeend", eventCard(e));
    });

    emptyMsg.classList.toggle("d-none", !snapshot.empty);
  }, (err) => {
    console.error(err);
    alert("Could not load events. Check the console (F12).");
  });
}

function eventCard(e) {
  return `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(e.title)}</h5>
          <p class="mb-1">📅 ${escapeHtml(e.date)} at ${escapeHtml(e.time)}</p>
          <p class="mb-1">📍 ${escapeHtml(e.venue)}</p>
          <p class="mb-2">👥 Capacity: ${e.capacity}</p>
          <p class="card-text text-muted">${escapeHtml(e.description)}</p>
        </div>
        <div class="card-footer bg-white d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm flex-fill" data-action="edit" data-id="${e.id}">Edit</button>
          <button class="btn btn-outline-danger btn-sm flex-fill" data-action="delete" data-id="${e.id}">Delete</button>
        </div>
      </div>
    </div>`;
}

// ---------- Edit and Delete buttons ----------
eventList.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "edit") {
    openForm(eventsById.get(id));
  } else if (btn.dataset.action === "delete") {
    if (confirm("Delete this event? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "events", id));
      } catch (err) {
        console.error(err);
        alert("Could not delete the event.");
      }
    }
  }
});

// ---------- Add / Edit form ----------
document.getElementById("addEventBtn").addEventListener("click", () => openForm(null));

function openForm(event) {
  form.reset();
  formError.classList.add("d-none");
  editingId = event ? event.id : null;
  document.getElementById("modalTitle").textContent = event ? "Edit Event" : "Add Event";

  if (event) {
    document.getElementById("title").value = event.title;
    document.getElementById("date").value = event.date;
    document.getElementById("time").value = event.time;
    document.getElementById("venue").value = event.venue;
    document.getElementById("capacity").value = event.capacity;
    document.getElementById("description").value = event.description;
  }
  modal.show();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.classList.add("d-none");

  const data = {
    title: document.getElementById("title").value.trim(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    venue: document.getElementById("venue").value.trim(),
    capacity: Number(document.getElementById("capacity").value),
    description: document.getElementById("description").value.trim()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    if (editingId) {
      await updateDoc(doc(db, "events", editingId), data);
    } else {
      await addDoc(collection(db, "events"), {
        ...data,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    }
    modal.hide();
  } catch (err) {
    console.error(err);
    formError.textContent = "Could not save the event. Please try again.";
    formError.classList.remove("d-none");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});