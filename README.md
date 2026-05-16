# VaxTrack: Baby Vaccination Tracking and Records Management System

> **Project Partner:** Barangay San Antonio de Padua I, Dasmariñas City, Cavite
> **Repository Scope:** Frontend Interface & UI/UX Prototype

---

## 1. Project Overview

**VaxTrack** is a web-based healthcare portal designed to digitize and streamline the paper-based baby vaccination tracking process for Barangay San Antonio de Padua I.

Historically, parents face challenges with losing physical immunization cards and missing critical follow-up schedules. This system provides a centralized digital solution to manage baby profiles, track upcoming vaccination schedules, and verify birth and health documents.

To ensure security and reduce cognitive overload, the system is strictly bifurcated into two environments:

* **Parent Portal:** A localized, minimal interface allowing parents to securely view only their own children's vaccination history, upcoming schedules, and digital calendar.
* **Admin / Barangay Health Worker (BHW) Portal:** A comprehensive management dashboard allowing health workers to manage the barangay's entire baby registry, log new vaccine doses, verify uploaded documents, and track overdue immunizations.

**Note:** This repository currently houses the **frontend prototype** designed to demonstrate the user interface, interaction design, and system architecture for a capstone defense.

---

## 2. Current Development Scope (Backend Dependency Disclaimer)

This repository focuses exclusively on the **frontend prototype and interface implementation**.

While the UI is fully interactive, **some system capabilities described in the project proposal are not yet operational**, as they require backend development and database integration, which are being handled separately by another team member.

Features that currently utilize **prototype UI flows or mock data** include:

* Secure authentication validation and session persistence
* Database storage and retrieval of baby profiles
* Image/document uploading to a cloud server
* Automated SMS or email reminder notifications
* Real-time synchronization between parent and admin portals

The frontend uses an internal `api.js` mock data layer to simulate these backend interactions, allowing the interface to be thoroughly tested and evaluated prior to final API integration.

---

## 3. Features

### 👨‍👩‍👧 Parent / User Features

* **Unified Authentication UI** ✅ — Seamless split-screen login/registration interface.
* **Parent Dashboard** ✅ — Clean grid layout displaying registered babies and their immediate next vaccine.
* **Baby Profile & Digital Calendar** ⚠️ — Detailed view of vaccination history and a prototype monthly calendar visualizing upcoming/overdue doses.
* **Baby Registration** 🚧 — Form interface for adding a new baby, pending backend file-upload processing for birth certificates.
* **Tagalog/English Localization** ⚠️ — Frontend-only language toggle (`i18n.js`) to ensure accessibility for varying levels of technical literacy.
* **Directory Search** ✅ — Real-time filtering of mock baby records by name.

### 🩺 Admin / Health Worker Features

* **BHW Dashboard** ⚠️ — High-level metrics displaying total babies, monthly vaccines, and urgent overdue alerts (using mock data aggregations).
* **Baby Directory** ✅ — Tabular interface to view and search the barangay's entire registry.
* **Vaccination Entry** 🚧 — Form to log new doses, currently simulating success states via frontend toasts.
* **Document Verification** ⚠️ — Interface for approving or flagging parent-uploaded documents.
* **Schedule Management** ✅ — Dynamic table to activate/deactivate standard DOH (Department of Health) vaccine timelines.

*(Legend: ✅ Fully Implemented UI | ⚠️ Prototype/Mock Functionality | 🚧 Pending Backend Integration)*

---

## 4. Tech Stack

The frontend is built using a lightweight, native web stack to ensure fast load times and straightforward backend integration.

* **HTML5:** Semantic markup and accessibility structure.
* **CSS3:** Custom responsive styling utilizing CSS Variables (`:root`), Flexbox, CSS Grid, and a "Glassmorphism" aesthetic.
* **Vanilla JavaScript (ES6):** Modular architecture (`import`/`export`) managing state, mock API fetching, DOM manipulation, and role-based routing.
* **FontAwesome (CDN):** Scalable vector icons for improved visual hierarchy.
* *No heavy frontend frameworks (e.g., React, Vue) were used, ensuring a clean handoff to PHP/Node.js backend architectures.*

---

## 5. Project Structure

```text
vaxtrack-frontend/
│── index.html                    # Unified Authentication & Registration Entry
│── css/
│   ├── main.css                  # Core design system, variables, modals, loaders
│   ├── user.css                  # Parent portal and unified auth layout styles
│   └── admin.css                 # BHW dashboard and sidebar layout styles
│── js/
│   ├── api.js                    # Mock database and simulated fetch() delays
│   ├── auth.js                   # Role-based route protection and local storage
│   ├── utils.js                  # Global UI components (Toasts, Loaders)
│   ├── i18n.js                   # Frontend Tagalog/English translation dictionary
│   ├── index.js                  # Authentication logic and view toggling
│   ├── user/                     # Parent-specific JS controllers
│   │   ├── dashboard.js
│   │   ├── baby-profile.js       # Includes prototype Digital Calendar logic
│   │   ├── baby-register.js
│   │   └── search.js
│   └── admin/                    # Admin-specific JS controllers
│       ├── dashboard.js
│       ├── baby-management.js
│       ├── document-verification.js
│       ├── schedule-management.js
│       └── vaccination-entry.js
│── user/                         # Parent HTML Views
│   ├── dashboard.html
│   ├── baby-profile.html
│   ├── baby-register.html
│   └── search.html
└── admin/                        # Admin HTML Views
    ├── dashboard.html
    ├── baby-management.html
    ├── document-verification.html
    ├── schedule-management.html
    └── vaccination-entry.html

```

---

## 6. Installation & Setup

Because this project utilizes ES6 JavaScript Modules (`<script type="module">`), opening the HTML files directly via the `file://` protocol will result in CORS errors. **A local web server is required to run the frontend.**

### Prerequisites

* [Visual Studio Code](https://code.visualstudio.com/)
* VS Code Extension: **Live Server** (by Ritwick Dey)
* *Alternative:* Node.js (`http-server`) or Python 3.

### Instructions

1. Clone or download this repository to your local machine.
2. Open the project folder in Visual Studio Code.
3. Right-click `index.html` and select **"Open with Live Server"**.
4. The application will launch in your default browser at `http://127.0.0.1:5500/`.

---

## 7. Authentication & Access Flow

The system features strict separation of concerns, prototyped via `js/auth.js`:

* **Parent Pathway:** Parents log in via the primary form on `index.html`. The mock auth assigns a `user` role to `localStorage`. Navigating to any `/admin/` URL will automatically redirect them back to safety.
* **Admin Pathway:** Health workers click the "Healthcare Worker Login" link. Logging in assigns an `admin` role. Navigating to any `/user/` URL will redirect them to their secure dashboard.
* *Note: Passwords are not currently hashed or validated against a real database. Any input currently triggers the mock success state for demonstration purposes.*

---

## 8. Current Implementation Status

### ✅ Fully Implemented (Frontend Level)

* Responsive layouts (Mobile/Tablet/Desktop).
* Modular CSS Design System ensuring visual consistency.
* Role-based navigation guards blocking unauthorized page access.
* Client-side search filtering algorithms.
* Dynamic DOM rendering for tables and dashboard grids.

### ⚠️ Partially Implemented (Mock Dependencies)

* **Digital Calendar:** Renders correctly, but relies on static JSON arrays instead of actual database timestamps.
* **Localization:** Tagalog translations switch smoothly, but currently rely on a hardcoded frontend dictionary (`i18n.js`).
* **Document Verification:** Approving/Flagging removes items from the DOM and shows a success toast, but does not update a real backend state.

### 🚧 Pending Backend Integration

* Registration form payload submission to an actual database.
* File uploading (Multipart form data) for Birth Certificates.
* Password hashing and JWT (JSON Web Token) generation.
* Automated SMS API integration for overdue vaccines.

---

## 9. UI/UX Design Principles

* **Low Cognitive Load:** Complex medical data is broken down into simple "Upcoming" and "History" tables. Warning badges (Green, Yellow, Red) immediately communicate status without requiring the user to read medical text.
* **Accessibility & Localization:** Integration of Tagalog phrasing ensures that users in Barangay San Antonio de Padua I can navigate the system comfortably regardless of technical proficiency.
* **Minimalist Healthcare Aesthetic:** Utilizes a professional blue/green color palette, ample whitespace, and modern glassmorphism to establish institutional trust while remaining friendly.

---

## 10. Future Improvements

* **Backend Integration:** Connect `js/api.js` wrappers to the live Node.js/PHP backend endpoints.
* **Automated Reminders:** Trigger SMS/Email notifications 3 days prior to a target vaccination date.
* **Advanced Analytics:** Add Chart.js to the BHW dashboard to visualize barangay immunization rates over time.
* **PWA Conversion:** Convert the frontend into a Progressive Web App so parents can install it directly on their mobile home screens for offline viewing.

---

## 11. Contributors

* **[Your Name/Teammate]** – Frontend Developer / UI/UX Design
* **[Teammate Name]** – Backend Developer / Database Architecture
* **[Teammate Name]** – Project Manager / System Analyst
* **[Teammate Name]** – QA / Documentation

*Developed as a Capstone Project for the community of Barangay San Antonio de Padua I, Dasmariñas City, Cavite.*
