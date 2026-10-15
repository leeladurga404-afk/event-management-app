# AI Prompts Used (Vibe Coding Log)

**AI tool used:** Claude (claude.ai)

## Prompt 1: Project setup
Explain the Event Management App project, the tech stack (HTML, CSS, JS, Bootstrap, Firebase, GitHub), and how to set it up step by step.

## Prompt 2: Login and signup page
Build the login/signup page using Bootstrap 5 and Firebase Auth. Save the user in a Firestore `users` collection with a `role` field (default "student"). Redirect admins to admin.html and students to events.html. Show friendly error messages and make it mobile-friendly.

## Prompt 3: Admin page
Build an admin page where only admins can add, edit, and delete events (title, date, time, venue, capacity, description). Use Firestore real-time updates and a Bootstrap modal.

## Notes
- Fixed: git "not a repository" error by running `git init`.
- Changed my user's role to "admin" manually in the Firestore console.

## Prompt 4: Student events page
Build a student page that lists events as Bootstrap cards, lets students register and cancel using Firestore transactions (block duplicates and full events), and has a "My Registrations" tab. Update live with onSnapshot.