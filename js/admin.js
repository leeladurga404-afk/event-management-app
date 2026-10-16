import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ---------- Page elements ----------
const loading = document.getElementById("loading");
const app = document.getElementById("app");
const eventList = document.getElementById("eventList");
const emptyMsg = document.getElementById("emptyMsg");
const form = document.getElementById("eventForm");
const formError = document.getElementById("formError");
const saveBtn = document.getElementById("saveBtn");

const registrationsTableBody =
  document.getElementById("registrationsTableBody");

const registrationCount =
  document.getElementById("registrationCount");

const registrationsEmptyMsg =
  document.getElementById("registrationsEmptyMsg");

const registrationsError =
  document.getElementById("registrationsError");

const registrationsLoading =
  document.getElementById("registrationsLoading");

const modal = new bootstrap.Modal(
  document.getElementById("eventModal")
);

let editingId = null;
const eventsById = new Map();

// ---------- HTML-safe display ----------
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

// ---------- Admin access ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const profileSnap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!profileSnap.exists() ||
        profileSnap.data().role !== "admin") {
      window.location.href = "events.html";
      return;
    }

    document.getElementById("userName").textContent =
      profileSnap.data().name || user.email || "Admin";

    loading.classList.add("d-none");
    app.classList.remove("d-none");

    listenToEvents();
    listenToRegistrations();

  } catch (error) {
    console.error("Admin access check failed:", error);
    loading.innerHTML =
      '<p class="text-danger">Could not verify admin access. Check the browser console.</p>';
  }
});

// ---------- Logout ----------
document.getElementById("logoutBtn").addEventListener(
  "click",
  async () => {
    await signOut(auth);
    window.location.href = "index.html";
  }
);
// ---------- Tabs ----------
const tabEvents = document.getElementById("tab-events");
const tabRegs = document.getElementById("tab-regs");

function showTab(which) {
  const isEvents = which === "events";
  document.getElementById("eventsSection").classList.toggle("d-none", !isEvents);
  document.getElementById("regsSection").classList.toggle("d-none", isEvents);
  tabEvents.classList.toggle("active", isEvents);
  tabRegs.classList.toggle("active", !isEvents);
}
tabEvents.addEventListener("click", () => showTab("events"));
tabRegs.addEventListener("click", () => showTab("regs"));

// ---------- Live events ----------
function listenToEvents() {
  const q = query(
    collection(db, "events"),
    orderBy("date")
  );

  onSnapshot(
    q,
    (snapshot) => {
      eventsById.clear();
      eventList.innerHTML = "";

      snapshot.forEach((eventDoc) => {
        const event = {
          id: eventDoc.id,
          ...eventDoc.data()
        };

        eventsById.set(event.id, event);
        eventList.insertAdjacentHTML(
          "beforeend",
          eventCard(event)
        );
      });

      emptyMsg.classList.toggle(
        "d-none",
        !snapshot.empty
      );
    },
    (error) => {
      console.error("Events loading error:", error);
      alert("Could not load events. Check the browser console.");
    }
  );
}

// ---------- Event card ----------
function eventCard(event) {
  return `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">
            ${escapeHtml(event.title)}
          </h5>

          <p class="mb-1">
            📅 ${escapeHtml(event.date)} at ${escapeHtml(event.time)}
          </p>

          <p class="mb-1">
            📍 ${escapeHtml(event.venue)}
          </p>

          <p class="mb-2">
            👥 Capacity: ${escapeHtml(event.capacity)}
          </p>

          <p class="card-text text-muted">
            ${escapeHtml(event.description)}
          </p>
        </div>

        <div class="card-footer bg-white d-flex gap-2">
          <button
            class="btn btn-outline-primary btn-sm flex-fill"
            data-action="edit"
            data-id="${escapeHtml(event.id)}"
          >
            Edit
          </button>

          <button
            class="btn btn-outline-danger btn-sm flex-fill"
            data-action="delete"
            data-id="${escapeHtml(event.id)}"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---------- Edit and Delete ----------
eventList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === "edit") {
    const selectedEvent = eventsById.get(id);

    if (selectedEvent) {
      openForm(selectedEvent);
    }

    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = confirm(
      "Delete this event and all its registrations? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      const registrationsSnapshot = await getDocs(
        query(
          collection(db, "registrations"),
          where("eventId", "==", id)
        )
      );

      // Firestore batches allow at most 500 writes.
      // Use smaller batches to avoid exceeding the limit.
      const refs = registrationsSnapshot.docs.map(
        (registration) => registration.ref
      );

      refs.push(doc(db, "events", id));

      for (let i = 0; i < refs.length; i += 450) {
        const batch = writeBatch(db);

        refs.slice(i, i + 450).forEach((ref) => {
          batch.delete(ref);
        });

        await batch.commit();
      }
    } catch (error) {
      console.error("Event deletion error:", error);
      alert("Could not delete the event. Check Firebase permissions.");
    }
  }
});

// ---------- Add event button ----------
document.getElementById("addEventBtn").addEventListener(
  "click",
  () => openForm(null)
);

// ---------- Open form ----------
function openForm(event) {
  form.reset();
  formError.classList.add("d-none");

  editingId = event ? event.id : null;

  document.getElementById("modalTitle").textContent =
    event ? "Edit Event" : "Add Event";

  if (event) {
    document.getElementById("title").value =
      event.title || "";

    document.getElementById("date").value =
      event.date || "";

    document.getElementById("time").value =
      event.time || "";

    document.getElementById("venue").value =
      event.venue || "";

    document.getElementById("capacity").value =
      event.capacity ?? 1;

    document.getElementById("description").value =
      event.description || "";
  }

  modal.show();
}

// ---------- Save event ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
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
      await updateDoc(
        doc(db, "events", editingId),
        data
      );
    } else {
      await addDoc(collection(db, "events"), {
        ...data,
        registeredCount: 0,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    }

    modal.hide();

  } catch (error) {
    console.error("Saving event error:", error);

    formError.textContent =
      "Could not save the event: " + error.message;

    formError.classList.remove("d-none");

  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

// ---------- Registered Students: live updates ----------
function listenToRegistrations() {
  registrationsLoading.classList.remove("d-none");
  registrationsError.classList.add("d-none");

  onSnapshot(
    collection(db, "registrations"),

    (snapshot) => {
      registrationsLoading.classList.add("d-none");
      registrationsError.classList.add("d-none");

      registrationsTableBody.innerHTML = "";

      const registrations = snapshot.docs.map((registration) => ({
        id: registration.id,
        ...registration.data()
      }));

      // Show the newest registrations first where timestamps exist.
            // Sort by event date, then time, then event name, then student name
      registrations.sort((a, b) =>
        (a.eventDate || "").localeCompare(b.eventDate || "") ||
        (a.eventTime || "").localeCompare(b.eventTime || "") ||
        (a.eventTitle || "").localeCompare(b.eventTitle || "") ||
        (a.userName || "").localeCompare(b.userName || "")
      );

      registrationCount.textContent = registrations.length;

      document.getElementById("tabRegCount").textContent = registrations.length;

      registrationsEmptyMsg.classList.toggle(
        "d-none",
        registrations.length > 0
      );

      registrations.forEach((registration) => {
        const row = document.createElement("tr");

        const values = [
          registration.eventTitle || "Unknown event",
          registration.eventDate || "—",
          registration.eventTime || "—",
          registration.eventVenue || "—",
          registration.userName || "Unknown",
          registration.userEmail || "Not available"
        ];

        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = String(value);
          row.appendChild(cell);
        });

        registrationsTableBody.appendChild(row);
      });
    },

    (error) => {
      console.error("Registrations loading error:", error);

      registrationsLoading.classList.add("d-none");
      registrationsEmptyMsg.classList.add("d-none");

      registrationsError.textContent =
        "Could not load registrations. Firebase says: " +
        error.message;

      registrationsError.classList.remove("d-none");
    }
  );
}
