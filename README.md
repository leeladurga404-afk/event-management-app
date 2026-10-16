# 🎓 Campus Event Management App

A responsive web app where students browse and register for college events, and admins create events and track who has registered.

🔗 **Live demo:** https://event-management-app-5faa8.web.app
💻 **GitHub:** https://github.com/leeladurga404-afk/event-management-app

---

## 📌 Problem It Solves

Colleges often manage events with paper forms or scattered messages. This app puts everything in one place: admins publish events, students register in one click, and everyone sees live seat availability.

---

## ✨ Features

### 👩‍🎓 Student
- Sign up and log in with email and password
- Forgot password (reset link sent by email)
- Browse all events as cards with live "spots left" count
- Register for an event with one click
- Cancel a registration
- **My Registrations** tab showing all joined events
- Past and full events are automatically disabled

### 🛠️ Admin
- Add, edit and delete events (title, date, time, venue, capacity, description)
- **Registered Students** tab: live table of every registration, sorted by event date
- Deleting an event also removes its registrations

### 🔒 Security and Reliability
- Role-based access (student vs admin) enforced by **Firestore security rules**
- Students cannot make themselves admin or edit events
- **Firestore transactions** prevent overbooking and duplicate registrations
- User input is escaped to prevent HTML injection

### 📱 Design
- Fully responsive with Bootstrap 5 (collapsing navbar, scrollable tables on mobile)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (ES modules), Bootstrap 5 |
| Authentication | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore (real-time listeners) |
| Hosting | Firebase Hosting |
| Version control | Git and GitHub |
| AI assistant | Claude AI (vibe coding) |

---

## 🗂️ Project Structure

```
event-management-app/
├── index.html          # Login / Sign up / Forgot password
├── events.html         # Student: browse events, My Registrations
├── admin.html          # Admin: manage events, registered students
├── 404.html
├── firebase.json       # Hosting configuration
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js   # Firebase setup (exports auth, db)
    ├── auth.js              # Login, signup, password reset, role redirect
    ├── events.js            # Student page logic
    └── admin.js             # Admin page logic
```

---

## 🗄️ Database Design (Firestore)

| Collection | Document ID | Main fields |
|---|---|---|
| `users` | user's uid | name, email, role (`student` / `admin`), createdAt |
| `events` | auto | title, date, time, venue, capacity, registeredCount, description, createdBy |
| `registrations` | `eventId_userId` | eventId, userId, userName, userEmail, eventTitle, eventDate, eventTime, eventVenue, registeredAt |

Using `eventId_userId` as the registration ID means a student physically cannot register twice for the same event.

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | (add your admin email) | (add password) |
| Student | (add a student email) | (add password) |

> Admin access is given by setting `role: "admin"` on a user's document in Firestore.

---

## 🚀 Run Locally

1. Clone the repository
```bash
   git clone https://github.com/leeladurga404-afk/event-management-app.git
```
2. Open the folder in VS Code
3. Install the **Live Server** extension
4. Right-click `index.html` → **Open with Live Server**

## ☁️ Deploy

```bash
firebase deploy --only hosting
```

---

## 🤖 How It Was Built

Built with **vibe coding**: describing each feature to Claude AI, testing it, and fixing problems step by step. The prompts used are listed in [`prompts.md`](prompts.md).

### Bugs found and fixed
- Deleting an event left orphaned registrations → fixed with a batched delete
- Students could not read a registration that did not exist yet → fixed in the security rules
- Live site showed old JavaScript → fixed with cache headers in `firebase.json`

---

## 👩‍💻 Author

**Leela Durga**
GitHub: [@leeladurga404-afk](https://github.com/leeladurga404-afk)