# VaxTrack

**Baby Vaccination Tracking and Records Management System**  
A web-based vaccination record portal for parents and Barangay Health Workers / administrators.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Status](#system-status)
3. [Core Users and Roles](#core-users-and-roles)
4. [Main Features](#main-features)
5. [Recently Added and Preserved Features](#recently-added-and-preserved-features)
6. [Frontend-Only Archive Workaround](#frontend-only-archive-workaround)
7. [Export Report Behavior](#export-report-behavior)
8. [Routing and API Behavior](#routing-and-api-behavior)
9. [Technology Stack](#technology-stack)
10. [Project Structure](#project-structure)
11. [Setup and Installation](#setup-and-installation)
12. [Running the Project Locally](#running-the-project-locally)
13. [Backend and Environment Configuration](#backend-and-environment-configuration)
14. [API Endpoint Reference](#api-endpoint-reference)
15. [Expected Database Tables](#expected-database-tables)
16. [LocalStorage Keys](#localstorage-keys)
17. [Testing Checklist](#testing-checklist)
18. [Troubleshooting](#troubleshooting)
19. [Known Limitations](#known-limitations)
20. [Recommended Next Steps](#recommended-next-steps)
21. [Contribution Notes](#contribution-notes)

---

## Project Overview

**VaxTrack** is a baby vaccination tracking and record management system designed to help parents and barangay health workers manage infant vaccination records in a more organized and accessible way.

The system supports two major workflows:

1. **Parent / User workflow**
   - Parents can register, log in, view their baby records, check upcoming vaccination schedules, review document status, and receive dashboard notifications.

2. **Admin / BHW workflow**
   - Admins or Barangay Health Workers can monitor registered babies, verify uploaded documents, log vaccinations, review schedules, inspect baby records, export filtered reports, and hide sample or test records using the frontend archive workaround.

The current project uses a lightweight stack: static HTML, CSS, vanilla JavaScript modules, and a PHP/MySQL backend.

---

## System Status

This version contains both frontend and backend files.

The project currently includes:

- Static HTML pages for parent and admin portals.
- CSS files for shared, parent, and admin layouts.
- Vanilla JavaScript modules for page controllers, API calls, authentication guards, modals, filters, exports, and local UI state.
- PHP backend route dispatcher.
- PHP route handlers for authentication, baby records, document verification, vaccination logging, schedules, dashboard statistics, and report export.
- MySQL connection support through environment variables.
- LocalStorage-based fallback behavior for archive functionality.

Important implementation note:

The **Archive Record** feature is currently implemented as a **frontend-only localStorage workaround**. It hides records on the current device/browser but does not update the database. This is intentional because the backend archive route is not available yet.

---

## Core Users and Roles

### Parent / User

Parents can:

- Create an account.
- Log in through the parent portal.
- Register baby records.
- Upload baby registration document information.
- View registered baby records.
- View vaccination history.
- View upcoming schedules.
- See notification reminders and alerts.
- Search baby records connected to their account.

### Admin / BHW

Admins can:

- Log in through the BHW/Admin login view.
- Access the admin dashboard.
- View overview counts and alert tables.
- Review medical alerts.
- Review document action items.
- Open baby record details from the Directory.
- Edit baby record information.
- Archive records locally using the frontend workaround.
- Restore locally archived records.
- Verify documents.
- Log vaccination records.
- View schedule lists.
- Export filtered CSV reports.

---

## Main Features

### Authentication

The login screen is located at:

```text
index.html
```

It contains three views:

- Parent Login
- Parent Registration
- Admin / BHW Login

The frontend login and registration logic is handled by:

```text
js/index.js
js/auth.js
js/api.js
```

The backend authentication handlers are:

```text
backend/auth/login.php
backend/auth/register.php
```

The login endpoint used by the frontend is:

```text
POST /auth/login
```

The API helper automatically tries supported deployment prefixes, including:

```text
/api/auth/login
/auth/login
/backend/auth/login
```

This prevents the app from breaking when the deployed backend uses a slightly different route prefix.

---

### Parent Dashboard

Files:

```text
user/dashboard.html
js/user/dashboard.js
css/user.css
```

Parent dashboard features include:

- Baby records panel.
- Selected baby details panel.
- Upcoming vaccination display.
- Document status display.
- Notification bell.
- Notification dropdown.
- Full notifications overlay.
- Mark-all-as-read behavior.
- Active-baby filtering so locally archived babies are hidden from normal parent views.

---

### Baby Registration

Files:

```text
user/baby-register.html
js/user/baby-register.js
backend/babies/create.php
```

Supported registration fields include:

- Baby first name.
- Baby middle name.
- Baby last name.
- Date of birth.
- Sex.
- Place of birth.
- Birth weight.
- Blood type.
- Mother name.
- Father name.
- Guardian name.
- Guardian phone.
- Guardian address.
- Private clinic indicator.
- Private clinic name.
- Birth certificate/document data.

When a baby is registered, the backend automatically creates default DOH schedule entries.

Default schedule generation includes:

- BCG
- Hepatitis B
- Penta 1
- OPV 1
- Penta 2
- OPV 2
- Penta 3
- OPV 3
- IPV
- MCV 1
- MCV 2

---

### Admin Dashboard

Files:

```text
admin/dashboard.html
js/admin/dashboard.js
backend/dashboard/stats.php
```

Dashboard features include:

- Total registered baby count.
- Vaccines recorded this month.
- Upcoming appointments within the next 7 days.
- Overdue alerts.
- Pending document count.
- Medical alerts table.
- Document action items table.
- Toggle between medical and document workflows.
- Filtered export for the currently viewed dashboard data.
- Scrollable, compact admin tables.

Locally archived babies are excluded from active dashboard counts and alert/action lists on the frontend.

---

### Admin Directory

Files:

```text
admin/baby-management.html
js/admin/baby-management.js
css/admin.css
```

Directory features include:

- Active baby records table.
- Archived records filter.
- Search by baby name, registration number, parent/guardian, or phone.
- Age group filter.
- Status summary filter.
- Active Records / Archived Records filter.
- Open-details icon beside each baby name.
- Full baby record details modal.
- Edit baby record modal.
- Archive Record confirmation modal.
- Restore locally archived record button.
- Filtered CSV export.
- Compact table layout.
- Scrollable table container.

Archived records are visible only when the Directory filter is changed to **Archived Records**.

---

### Baby Details Modal

The Directory details modal shows:

- Baby profile information.
- Parent / guardian information.
- Private clinic information.
- Vaccination records.
- Upcoming schedule records.
- Uploaded documents.
- Medical/test history.
- Local archive audit information when viewing archived records.
- Edit and archive/restore actions.

The open-details behavior is triggered through the icon beside the baby name in the Directory table.

---

### Edit Baby Record

Files:

```text
js/admin/baby-management.js
backend/babies/update.php
```

Admins can edit selected baby record fields, including:

- First name.
- Middle name.
- Last name.
- Date of birth.
- Sex.
- Place of birth.
- Birth weight.
- Blood type.
- Mother name.
- Father name.
- Guardian name.
- Guardian phone.
- Guardian address.
- Private clinic flag.
- Private clinic name.

The backend update endpoint requires an edit reason/comment.

Supported update routes include:

```text
PATCH /babies/:id
PUT /babies/:id
PATCH /admin/babies/:id
PUT /admin/babies/:id
POST /babies/:id/update
POST /admin/babies/:id/update
```

The update handler can also write to an optional audit table:

```text
child_edit_audit
```

---

### Document Verification

Files:

```text
admin/document-verification.html
js/admin/document-verification.js
backend/documents/update-status.php
```

Admin document verification supports:

- Viewing pending/reviewable documents.
- Opening document previews.
- Approving documents.
- Rejecting documents with a comment.
- Updating child registration status when a document is approved or rejected.
- Exporting filtered document review data.

Document update endpoint:

```text
PATCH /documents/:docId
```

---

### Document Preview / Review Modal

The document preview modal is implemented through shared utilities.

Important file:

```text
js/utils.js
```

The modal is used by admin review flows and baby details flows. It supports preview-friendly document display where available and keeps the UI separate from the main table.

---

### Vaccination Logging

Files:

```text
admin/vaccination-entry.html
js/admin/vaccination-entry.js
backend/vaccinations/create.php
```

Admins can log vaccine administration records with:

- Baby record selection.
- Vaccine name.
- Date.
- Dose.
- Batch/lot number.
- Worker/administered-by field.
- Private clinic option.
- Clinic name.

Endpoint:

```text
POST /babies/:babyId/vaccinations
```

When a vaccination is logged:

- A vaccination row is inserted.
- The matching schedule item is marked as completed when applicable.
- The `vaccines_received` table is updated for selected vaccine categories when applicable.

The baby dropdown hides locally archived babies from active selections.

---

### Schedule Management

Files:

```text
admin/schedule-management.html
js/admin/schedule-management.js
backend/schedules/get.php
```

Schedule features include:

- Viewing schedule records.
- Automatically marking overdue schedules on backend fetch.
- Filtering frontend active baby lists to exclude locally archived babies.
- Exporting filtered schedule data.

Endpoint:

```text
GET /schedules
```

---

### Localization

Files:

```text
js/i18n.js
```

The app includes English/Tagalog text support through frontend translation keys.

Note: the current `setupI18n()` function clears the saved language value from `localStorage`, so the language behavior may reset depending on the current implementation.

---

## Recently Added and Preserved Features

This README reflects the current version after preserving the recently added features.

Preserved features include:

- Archive Record feature.
- Frontend/localStorage archive fallback.
- Export Report feature.
- Export behavior that respects active filters.
- Pending registration view.
- Notification bell/dropdown.
- Document preview/review modal.
- Directory open-details icon/modal.
- Scrollable tables.
- Compact admin tables.
- Admin dashboard layout improvements.
- Route Not Found prevention through safer API route fallback handling.

---

## Frontend-Only Archive Workaround

### Purpose

The archive feature is currently implemented as a **prototype-only frontend workaround** because the backend archive endpoint is not available yet.

This means:

- The database is not modified.
- The record is not permanently deleted.
- Related vaccination history is not removed.
- Related documents are not removed.
- Related schedules are not removed.
- The record is hidden only in the current browser/device.

### LocalStorage Keys

Archived baby IDs are stored in:

```text
vaxtrack_archived_baby_ids
```

Archive metadata is stored in:

```text
vaxtrack_archived_baby_meta
```

### Archive Logic

The core archive behavior is in:

```text
js/utils.js
```

Relevant helper functions:

```text
getArchivedBabyIds()
isBabyLocallyArchived(babyOrId)
filterActiveBabies(babies)
archiveBabyLocally(babyOrId, reason)
restoreBabyLocally(babyOrId)
getLocalArchiveMeta(babyOrId)
```

The project includes this required code comment in the archive helper:

```js
// Prototype-only archive workaround.
// This hides records locally using localStorage.
// It does not update the database.
```

### What Happens When an Admin Archives a Record

When the admin clicks **Archive Record** and types `ARCHIVE`:

1. The baby record ID is saved to `localStorage`.
2. Optional reason/comment metadata is saved locally.
3. The archive confirmation modal closes.
4. The baby details modal closes.
5. The Directory list refreshes.
6. The baby is hidden from active frontend views.
7. A success message appears:

```text
Record archived successfully.
```

### Archive Confirmation Modal

The modal is intentionally minimalist and neutral.

It shows only:

- Baby name.
- Registration number.
- Short confirmation message.
- Optional reason/comment field.
- Confirmation input.
- Cancel button.
- Archive Record button.

The confirmation input requires:

```text
ARCHIVE
```

The Archive Record button stays disabled until `ARCHIVE` is typed exactly.

### Where Archived Records Are Hidden

Locally archived babies are hidden from active frontend views, including:

- Admin Directory active table.
- Parent Dashboard baby list.
- Overview counts.
- Medical alerts.
- Document action items.
- Log Vaccine baby dropdown.
- Schedule lists connected to active babies.

### Viewing and Restoring Archived Records

In the Admin Directory, use the archive filter:

```text
Active Records
Archived Records
```

Archived records show in the archived view only.

To restore a record:

1. Switch to **Archived Records**.
2. Click **Restore**.
3. The baby ID is removed from `vaxtrack_archived_baby_ids`.
4. The record becomes visible again in active views.

### Important Limitation

Because this is localStorage-based:

- Another browser will still see the record.
- Another device will still see the record.
- Clearing browser storage will restore the hidden record.
- The database remains unchanged.
- This is not a real backend archive.

A production-ready archive feature should use a backend column such as:

```text
is_archived
archived_at
archive_reason
archived_by
```

---

## Export Report Behavior

The project includes export support in multiple admin views.

### Dashboard Export

File:

```text
js/admin/dashboard.js
```

The dashboard export uses the currently selected dashboard workflow/filter and creates a CSV from the currently filtered frontend data.

This means export respects active filters.

### Directory Export

File:

```text
js/admin/baby-management.js
```

The Directory export respects:

- Search query.
- Age group filter.
- Status filter.
- Active/Archived filter.

### Document Verification Export

File:

```text
js/admin/document-verification.js
```

The document export uses the current filtered document review table.

### Vaccination Entry Export

File:

```text
js/admin/vaccination-entry.js
```

The vaccination export uses the current filtered vaccination log data.

### Schedule Export

File:

```text
js/admin/schedule-management.js
```

The schedule export uses the current filtered schedule data.

### Backend Export Route

The backend contains a full CSV report export route:

```text
backend/reports/export.php
```

Registered route aliases include:

```text
GET /reports/export
GET /admin/reports/export
GET /dashboard/export
```

The frontend backend-export helper also attempts additional path variations for deployment compatibility.

### Frontend Export Fallback

If the backend export route is unavailable, the frontend can generate a CSV from currently loaded database data.

This prevents the Export Report button from producing a global **Route Not Found** error when the backend export route is not available yet.

---

## Routing and API Behavior

### Frontend API Helper

Main file:

```text
js/api.js
```

The project uses:

```js
const API_ORIGIN = 'https://vaxtrack-database-production.up.railway.app';
```

The API helper builds candidate URLs using these prefixes:

```text
/api
empty prefix
/backend
```

For example, when the frontend calls:

```text
/auth/login
```

The helper may try:

```text
https://vaxtrack-database-production.up.railway.app/api/auth/login
https://vaxtrack-database-production.up.railway.app/auth/login
https://vaxtrack-database-production.up.railway.app/backend/auth/login
```

It retries another prefix only when the response clearly indicates a missing route, such as:

- HTTP 404
- `Route not found`
- `Not found`

It does not retry normal validation, authentication, or server errors as duplicate POST actions.

### Backend Router

Main file:

```text
backend/index.php
```

The backend router normalizes route paths and supports common deployment prefixes:

```text
/api
/backend
/index.php
```

This prevents valid endpoints like `/auth/login` from being incorrectly converted into `/login`.

### 404 Handler

The backend 404 response is intentionally last in `backend/index.php`:

```php
respondError('Route not found', 404);
```

Valid routes should be matched before reaching this fallback.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript ES modules
- Font Awesome CDN icons
- Browser LocalStorage
- CSV generation through Blob/download links

### Backend

- PHP 8.2
- PDO
- MySQL
- PHP built-in server support
- Apache `.htaccess` rewrite support
- Railway-compatible environment variables

### Deployment / Runtime

- Dockerfile included for PHP runtime
- Railway-style environment variables supported
- Static frontend can run through Live Server, Python HTTP server, or any static web host

---

## Project Structure

```text
VAXTRACK/
├── Dockerfile
├── index.html
├── admin/
│   ├── baby-management.html
│   ├── dashboard.html
│   ├── document-verification.html
│   ├── schedule-management.html
│   └── vaccination-entry.html
├── backend/
│   ├── .htaccess
│   ├── index.php
│   ├── auth/
│   │   ├── login.php
│   │   └── register.php
│   ├── babies/
│   │   ├── create.php
│   │   ├── delete.php
│   │   ├── get.php
│   │   └── update.php
│   ├── config/
│   │   └── db.php
│   ├── dashboard/
│   │   └── stats.php
│   ├── documents/
│   │   └── update-status.php
│   ├── helpers/
│   │   └── helpers.php
│   ├── reports/
│   │   └── export.php
│   ├── schedules/
│   │   └── get.php
│   └── vaccinations/
│       └── create.php
├── css/
│   ├── admin.css
│   ├── main.css
│   └── user.css
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── i18n.js
│   ├── index.js
│   ├── utils.js
│   ├── admin/
│   │   ├── baby-management.js
│   │   ├── dashboard.js
│   │   ├── document-verification.js
│   │   ├── schedule-management.js
│   │   └── vaccination-entry.js
│   └── user/
│       ├── baby-profile.js
│       ├── baby-register.js
│       ├── dashboard.js
│       └── search.js
└── user/
    ├── baby-profile.html
    ├── baby-register.html
    ├── dashboard.html
    └── search.html
```

---

## Setup and Installation

### Prerequisites

Install the following:

- A modern browser such as Chrome, Edge, or Firefox.
- PHP 8.2 or newer.
- MySQL database.
- Optional: Visual Studio Code.
- Optional: Live Server extension for VS Code.
- Optional: Docker.

### Download / Extract

Extract the project zip, then open the folder:

```text
VAXTRACK
```

---

## Running the Project Locally

The project uses JavaScript ES modules. Do not open HTML files directly through `file://` because browser module/CORS behavior may break imports.

Use a local web server.

### Option 1: Run Frontend with VS Code Live Server

1. Open the `VAXTRACK` folder in VS Code.
2. Right-click `index.html`.
3. Choose **Open with Live Server**.
4. The frontend should open at a URL similar to:

```text
http://127.0.0.1:5500/index.html
```

### Option 2: Run Frontend with Python

From inside the `VAXTRACK` folder:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500/index.html
```

### Run Backend Locally with PHP

From inside the `VAXTRACK` folder:

```bash
php -S 127.0.0.1:8000 -t backend backend/index.php
```

Backend routes will be available at:

```text
http://127.0.0.1:8000/auth/login
http://127.0.0.1:8000/api/auth/login
http://127.0.0.1:8000/babies
http://127.0.0.1:8000/reports/export
```

### Point Frontend to Local Backend

In:

```text
js/api.js
```

Change:

```js
const API_ORIGIN = 'https://vaxtrack-database-production.up.railway.app';
```

to:

```js
const API_ORIGIN = 'http://127.0.0.1:8000';
```

Then refresh the frontend.

---

## Backend and Environment Configuration

Database configuration is in:

```text
backend/config/db.php
```

The backend reads these environment variables:

| Variable | Purpose |
|---|---|
| `MYSQLHOST` | MySQL host |
| `MYSQLPORT` | MySQL port |
| `MYSQLUSER` | MySQL username |
| `MYSQLPASSWORD` | MySQL password |
| `MYSQLDATABASE` | MySQL database name |

Recommended production practice:

- Use environment variables for all database credentials.
- Do not hardcode production credentials in committed files.
- Rotate credentials if a real database password was ever exposed in shared source code.

### Docker Runtime

The included Dockerfile uses PHP 8.2 CLI and installs PDO MySQL.

Build:

```bash
docker build -t vaxtrack .
```

Run:

```bash
docker run --rm -p 8000:8000 \
  -e PORT=8000 \
  -e MYSQLHOST=your-host \
  -e MYSQLPORT=3306 \
  -e MYSQLUSER=your-user \
  -e MYSQLPASSWORD=your-password \
  -e MYSQLDATABASE=your-db \
  vaxtrack
```

Open:

```text
http://localhost:8000/auth/login
```

---

## API Endpoint Reference

The backend router is in:

```text
backend/index.php
```

### Auth

| Method | Route | File | Description |
|---|---|---|---|
| `POST` | `/auth/login` | `backend/auth/login.php` | Login parent/admin user |
| `POST` | `/auth/register` | `backend/auth/register.php` | Register a parent account |

### Babies

| Method | Route | File | Description |
|---|---|---|---|
| `GET` | `/babies` | `backend/babies/get.php` | Get baby records; admin gets all, parent gets own records |
| `POST` | `/babies` | `backend/babies/create.php` | Create baby registration |
| `PATCH` / `PUT` | `/babies/:id` | `backend/babies/update.php` | Update baby record |
| `PATCH` / `PUT` | `/admin/babies/:id` | `backend/babies/update.php` | Admin alias for updating baby record |
| `POST` | `/babies/:id/update` | `backend/babies/update.php` | Fallback update alias |
| `POST` | `/admin/babies/:id/update` | `backend/babies/update.php` | Admin fallback update alias |
| `DELETE` | `/babies/:id` | `backend/babies/delete.php` | Existing delete handler; not used by the current frontend archive workflow |
| `POST` / `DELETE` | `/babies/:id/delete` | `backend/babies/delete.php` | Delete fallback alias; not used by the current archive workflow |

Important:

The current Archive Record feature does **not** call the delete endpoint.

### Vaccinations

| Method | Route | File | Description |
|---|---|---|---|
| `POST` | `/babies/:id/vaccinations` | `backend/vaccinations/create.php` | Log vaccine administration |

### Documents

| Method | Route | File | Description |
|---|---|---|---|
| `PATCH` | `/documents/:id` | `backend/documents/update-status.php` | Approve or reject document |

### Schedules

| Method | Route | File | Description |
|---|---|---|---|
| `GET` | `/schedules` | `backend/schedules/get.php` | Get schedule records |

### Dashboard

| Method | Route | File | Description |
|---|---|---|---|
| `GET` | `/dashboard/stats` | `backend/dashboard/stats.php` | Get admin dashboard counts |

### Reports

| Method | Route | File | Description |
|---|---|---|---|
| `GET` | `/reports/export` | `backend/reports/export.php` | Download full CSV report |
| `GET` | `/admin/reports/export` | `backend/reports/export.php` | Export route alias |
| `GET` | `/dashboard/export` | `backend/reports/export.php` | Export route alias |

### Supported Prefix Variants

The router is designed to support these common path variants:

```text
/auth/login
/api/auth/login
/backend/auth/login
/index.php/auth/login
```

The same prefix behavior applies to other registered backend routes.

---

## Expected Database Tables

The backend references these tables.

### `users`

Used by authentication.

Expected fields include:

```text
id
first_name
last_name
email
password
role
```

`role` should support values such as:

```text
parent
admin
```

### `children`

Used for baby records.

Expected fields include:

```text
id
user_id
registration_number
first_name
middle_name
last_name
dob
sex
place_of_birth
birth_weight
blood_type
mother_name
father_name
guardian_name
guardian_phone
guardian_address
private_clinic
private_clinic_name
registration_status
created_at
```

Optional edit/audit-related fields supported by the backend if present:

```text
updated_at
last_updated
updated_by
last_updated_by
update_reason
last_update_reason
```

### `documents`

Expected fields include:

```text
id
child_id
type
filename
file_path
mime_type
status
comment
created_at
```

### `vaccinations`

Expected fields include:

```text
id
child_id
vaccine
date
dose
batch
worker
private_clinic
clinic_name
status
remarks
reaction
```

### `schedules`

Expected fields include:

```text
id
child_id
vaccine
target_date
status
```

### `test_history`

Expected fields include:

```text
id
child_id
test
date
result
remarks
comment
```

### `vaccines_received`

The vaccination create handler updates this table for selected vaccine categories.

Expected fields include:

```text
id
child_id
bcg_date
penta3_date
opv3_date
mcv1_date
mcv2_date
```

### `child_edit_audit`

This table is created automatically by `backend/babies/update.php` if possible.

Expected fields:

```text
id
child_id
edited_by
edited_at
reason
fields_changed
```

---

## LocalStorage Keys

The app uses browser LocalStorage for session state and frontend-only prototype behavior.

| Key | Purpose |
|---|---|
| `vax_token` | Current login token |
| `vax_role` | Current user role |
| `vax_name` | Display name |
| `vax_first_name` | Parent first name, when available |
| `vax_last_name` | Parent last name, when available |
| `vax_email` | Current user email |
| `vax_id` | Current user ID |
| `vax_parent_users` | Legacy/prototype parent user list |
| `vaxtrack_archived_baby_ids` | Frontend-only archive ID list |
| `vaxtrack_archived_baby_meta` | Frontend-only archive reason/date/admin metadata |
| `vax_read_notifications_<email>` | Read notification IDs per parent email |

To reset local prototype archive state in the browser console:

```js
localStorage.removeItem('vaxtrack_archived_baby_ids');
localStorage.removeItem('vaxtrack_archived_baby_meta');
```

To clear the current session:

```js
localStorage.removeItem('vax_token');
localStorage.removeItem('vax_role');
localStorage.removeItem('vax_name');
localStorage.removeItem('vax_email');
localStorage.removeItem('vax_id');
```

---

## Testing Checklist

Use this checklist after modifying routes, API calls, or UI features.

### Authentication

- [ ] Parent login page loads.
- [ ] Parent registration view opens.
- [ ] BHW/Admin login view opens.
- [ ] Parent login sends request to a valid auth route.
- [ ] Admin login sends request to a valid auth route.
- [ ] Invalid credentials show an error instead of a Route Not Found message.
- [ ] Successful parent login redirects to `user/dashboard.html`.
- [ ] Successful admin login redirects to `admin/dashboard.html`.

### Parent Portal

- [ ] Parent dashboard loads.
- [ ] Baby list loads.
- [ ] Locally archived babies are hidden from the parent baby list.
- [ ] Notification bell opens.
- [ ] Notification dropdown shows items.
- [ ] Mark all as read works.
- [ ] Baby profile/details display correctly.
- [ ] Search page filters records.

### Admin Dashboard

- [ ] Dashboard loads after admin login.
- [ ] Overview counts render.
- [ ] Medical alerts render.
- [ ] Document action items render.
- [ ] Alert/action filters work.
- [ ] Export downloads a CSV based on the active filter.
- [ ] Locally archived babies are excluded from active counts and action lists.

### Admin Directory

- [ ] Directory loads.
- [ ] Search works.
- [ ] Age filter works.
- [ ] Status filter works.
- [ ] Active Records view shows non-archived records only.
- [ ] Archived Records view shows locally archived records only.
- [ ] Open-details icon opens the details modal.
- [ ] Baby name displays without duplicate `ARCHIVED` label beside it.
- [ ] Archived status appears only in the Status Summary column.
- [ ] Archive Record modal opens.
- [ ] Archive button is disabled until `ARCHIVE` is typed.
- [ ] Archive stores the ID in `localStorage`.
- [ ] Archive closes both archive and details modals.
- [ ] Archived record disappears from Active Records.
- [ ] Archived record appears under Archived Records.
- [ ] Restore removes the ID from localStorage.
- [ ] Export respects the current Directory filters.

### Document Verification

- [ ] Verify Docs page loads.
- [ ] Document preview/review modal opens.
- [ ] Approve action works.
- [ ] Reject action requires a comment.
- [ ] Export respects filtered document data.

### Vaccination Entry

- [ ] Log Vaccine page loads.
- [ ] Baby dropdown excludes locally archived babies.
- [ ] Vaccine record form submits to the correct route.
- [ ] Completed vaccination updates schedule state where applicable.
- [ ] Export respects current filtered vaccine log data.

### Schedules

- [ ] Schedules page loads.
- [ ] Schedule list renders.
- [ ] Locally archived babies are hidden from active schedule views.
- [ ] Export respects current schedule filters.

### Routing

- [ ] `/auth/login` is recognized by the backend.
- [ ] `/api/auth/login` is recognized by the backend.
- [ ] `/backend/auth/login` is recognized by the backend.
- [ ] `/babies` is recognized by the backend.
- [ ] `/api/babies` is recognized by the backend.
- [ ] `/reports/export` is recognized by the backend if backend export is deployed.
- [ ] Unknown routes return Route Not Found only when truly invalid.

---

## Troubleshooting

### Problem: Route Not Found appears on the login page

Likely causes:

- The frontend API origin points to the wrong backend.
- The backend router is not being served through `backend/index.php`.
- The deployment expects `/api/auth/login`, but the frontend is reaching `/auth/login`, or the reverse.
- The server rewrite configuration is not forwarding routes to `index.php`.

What to check:

1. Open `js/api.js`.
2. Confirm `API_ORIGIN` points to the correct backend domain.
3. Confirm the backend is serving `backend/index.php`.
4. Test these endpoints:

```text
/auth/login
/api/auth/login
/backend/auth/login
```

Expected result for a GET request may still be Route Not Found because login requires POST. For real testing, send a POST request with email/password.

### Problem: Login works locally but not on Railway

Check Railway environment variables:

```text
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
```

Also confirm the deployed service starts PHP using:

```text
php -S 0.0.0.0:$PORT -t /app/backend /app/backend/index.php
```

The included Dockerfile already uses this pattern.

### Problem: Archive does not affect another browser/device

This is expected.

The archive workaround uses localStorage. It is browser/device-specific and does not update the database.

### Problem: Archived record appears again after clearing browser data

This is expected.

Clearing localStorage removes the locally archived ID list.

### Problem: Export route is missing

The frontend should use a fallback CSV export when the backend export route is unavailable.

If the backend export route should work, confirm:

```text
backend/reports/export.php
backend/index.php
```

and check that `/reports/export` is registered before the 404 fallback.

### Problem: Admin pages redirect to login

Admin pages call:

```js
requireAdminAuth();
```

This requires:

```text
vax_token
vax_role = admin
```

If the token or role is missing, the user is redirected to login.

### Problem: Parent pages redirect to login

Parent pages call:

```js
requireAuth();
```

This requires:

```text
vax_token
vax_role = user or parent
```

---

## Known Limitations

1. **Archive is frontend-only**
   - It uses localStorage.
   - It does not update the database.
   - It does not sync across devices.

2. **Authentication token is simple**
   - The backend token is currently a base64-encoded user ID.
   - Production should use a secure session or JWT strategy.

3. **No real backend archive column yet**
   - Production archive should use real database fields such as `is_archived`, `archived_at`, `archive_reason`, and `archived_by`.

4. **Hardcoded API origin**
   - `API_ORIGIN` is directly set in `js/api.js`.
   - A build-time or environment-based configuration would be cleaner for production.

5. **File upload handling is base64-oriented**
   - The current registration flow can store document data from base64.
   - Production may need multipart upload and storage limits.

6. **Role-based route guards are frontend-assisted**
   - Frontend guards improve navigation behavior.
   - Backend authorization remains required for real security.

7. **Some frontend UI data depends on loaded baby records**
   - If `/babies` fails, dependent lists and filters cannot populate.

---

## Recommended Next Steps

### High Priority

1. Implement a real backend archive endpoint.

Recommended route:

```text
PATCH /admin/babies/:babyId/archive
```

Recommended payload:

```json
{
  "isArchived": true,
  "archivedAt": "2026-05-26T00:00:00.000Z",
  "archiveReason": "Duplicate test registration",
  "archivedBy": "admin-user-id"
}
```

Recommended database fields:

```text
is_archived
archived_at
archive_reason
archived_by
```

2. Update backend list queries to exclude archived records by default.

Example:

```sql
WHERE is_archived = 0
```

3. Add an admin-only query option for archived records.

Example:

```text
GET /babies?archiveStatus=archived
```

4. Replace localStorage archive logic with backend archive logic while keeping localStorage as fallback only.

### Medium Priority

- Move API origin configuration out of `js/api.js`.
- Add stronger backend authentication.
- Add better error states for network/database failures.
- Add input validation consistency between frontend and backend.
- Add database migration scripts.
- Add seed data for testing.
- Add automated tests for route matching.

### Low Priority

- Improve offline support.
- Convert parent portal into a Progressive Web App.
- Add analytics charts to admin dashboard.
- Add SMS/email reminder integration.
- Add audit log UI for record edits and archive/restore actions.

---

## Contribution Notes

When modifying the project, follow these rules:

1. Do not remove recently added features unless intentionally replacing them.
2. Do not call the broken delete route from the Archive Record workflow.
3. Keep backend route registration above the 404 fallback.
4. Keep export fallback behavior so report export does not fail when backend export is unavailable.
5. Keep frontend filters consistent across Directory, Dashboard, Documents, Vaccination Entry, and Schedules.
6. Keep localStorage archive comments clear so future developers understand that it is prototype-only.
7. Test login first after any router or API helper change.

---

## Quick Commands

Run frontend:

```bash
python3 -m http.server 5500
```

Run backend:

```bash
php -S 127.0.0.1:8000 -t backend backend/index.php
```

Open frontend:

```text
http://localhost:5500/index.html
```

Clear local archive state:

```js
localStorage.removeItem('vaxtrack_archived_baby_ids');
localStorage.removeItem('vaxtrack_archived_baby_meta');
```

---

## Final Notes

VaxTrack is structured as a simple, understandable capstone-ready system. It avoids heavy frontend frameworks and keeps the UI logic in readable JavaScript modules. The current version preserves all recent admin workflow improvements while stabilizing global route behavior and providing safe frontend fallbacks for archive and export features.

The most important production improvement is replacing the localStorage archive workaround with a real backend soft-delete/archive endpoint.
