# 🌐 UniSphere - Smart Campus Management System

**UniSphere** is a premium, high-performance Smart Campus Management System designed to harmonize campus life. It serves as a unified ecosystem where resources are managed with precision, maintenance is handled with absolute efficiency, and all user roles collaborate seamlessly.

---

## 🎨 Global System Features (All Roles)

UniSphere is designed to provide a premium, dynamic, and accessible experience for all users. The following core functionalities are available across the entire platform:

*   **🌐 Multilingual Translation:** Full localization support to instantly translate the entire interface between **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.
*   **🌓 Dynamic Appearance:** A sleek dark/light mode toggle with smooth glassmorphic styling, harmonious color palettes, and micro-interactions.
*   **📊 Full-Featured Dashboards:** Rich, role-specific control rooms displaying key analytics, real-time statistics, calendars, and action cards.
*   **🔍 Advanced Filtering:** Intuitive search, sorting, and filter options across all tables, lists, and ticket queues.
*   **🔔 Real-Time Notification Engine:** Contextual notification alerts triggered for every critical system task or status change.
    *   **Notification Preferences:** 
        *   **Students (Users):** Fine-grained control to toggle ON/OFF notifications for *All Notifications*, *Bookings*, *Tickets*, and *Lectures*.
        *   **Lecturers:** Customizable toggles to turn ON/OFF notifications for *All Notifications*, *Bookings*, and *Tickets*.
*   **🔒 Account Security:** Password update capabilities in profile settings (restricted to manually authenticated accounts; Google OAuth users cannot modify passwords).

---

## 👥 Role-Based Feature Matrices

UniSphere defines four core roles, each with custom dashboards, tools, and permissions.

### 1. 👤 Student (User) Role
The Student portal provides a unified hub for students to manage campus facilities, track lecture sessions, confirm attendance, and report maintenance issues.

*   **🔑 Flexible Authentication:**
    *   Log in via Google Account OAuth 2.0 or manual credentials (Email/Password).
    *   Forgot Password retrieval capability.
*   **🏫 Profile Settings:**
    *   Configure profile details: Faculty, Specialization, Academic Level (Current Year & Semester), and Bio.
    *   **Name & Password Lock:** If logged in via Google, Name and Password are read-only and locked. If logged in manually, Name and Password can be updated freely.
*   **📅 Study Rooms & Sport Arenas Booking:**
    *   **Access Restricted:** Students can only reserve *Study Rooms* and *Sport Arenas*.
    *   **Intelligent Availability:** The booking engine automatically queries campus operational hours and displays only vacant time slots.
    *   **Admin Approval Loop:** Instantly receive status notifications (Approved/Rejected) once administrators review the booking request.
    *   **Booking History:** View comprehensive status details of all past and upcoming personal bookings.
*   **📚 Academic Lectures Integration:**
    *   **Lecture Session Feed:** View session details (Location, Date & Time, and attached PDF/Slide Documents) shared by Lecturers matching the student's assigned Batch.
    *   **Session Rating:** Rate the lecture session upon completion to provide academic feedback.
    *   **QR-Based Attendance:** Confirm lecture attendance instantly by scanning the system-generated QR code, which displays a verification form. Submitting this form confirms attendance.
*   **🎫 Issue Reporting (Ticketing):**
    *   Report maintenance problems on campus by creating a support ticket.
    *   Provide description, location, and visual evidence (uploaded images).
    *   Select/route the ticket to the most appropriate technical category or technician.
    *   Monitor the status of personal tickets.
*   **📢 Announcements:**
    *   Access a live bulletin board to view campus notices and announcements published by Lecturers and Admins.

---

### 2. 👨‍🏫 Lecturer Role
The Lecturer workspace equips teaching staff with advanced reservation capabilities, batch management tools, and communication channels.

*   **🔑 Secure Onboarding & Authentication:**
    *   Lecturers cannot self-register; they are onboarded exclusively by Administrators.
    *   The Admin collects their personal email and sends an invitation containing temporary credentials (system email and temporary password).
    *   Log in using the temporary credentials, then update the password to secure the account.
    *   Forgot Password option is available for subsequent logins.
*   **🏫 Profile Settings:**
    *   Configure academic details: Honorific (Dr./Prof./Mr./Ms.), Name, Faculty, Department, Designation, Assigned Batches (Current years and semesters), Modules, and Bio.
    *   Update account password from settings.
*   **📅 Premium Facilities Booking:**
    *   **All Facilities Access:** Book *any* campus facility (Auditoriums, Labs, Lecture Halls, Study Rooms, and Sports Arenas).
    *   **Intelligent Availability:** Available time slots within campus working hours are displayed automatically.
    *   **Admin Approval Loop:** Receives real-time notification alerts upon Admin approval or rejection.
*   **📖 Lecture Session Sharing:**
    *   Convert facility bookings into active lecture sessions.
    *   Share session locations, dates, times, and lecture documents directly with assigned student batches.
    *   Track student attendance lists and view session logs.
*   **👥 Batch & Student Directory:**
    *   View structured student lists for assigned batches.
    *   Download the entire student list as a professional PDF report.
*   **🎫 Issue Reporting (Ticketing):**
    *   Report teaching facility faults (e.g., faulty projectors, AC issues) by filing a ticket with location and uploaded image evidence.
    *   View details of submitted tickets.
*   **📢 Announcements:**
    *   Draft and publish announcements and urgent notices directly to the student bulletin feed.

---

### 3. 🔧 Technician Role
The Technician workspace is designed for field staff to receive, update, and resolve campus maintenance tickets.

*   **🔑 Secure Onboarding & Authentication:**
    *   Technicians are registered exclusively by Administrators using their personal emails.
    *   Receive system invitations with temporary credentials (system email and temporary password).
    *   Log in and perform an initial password change.
    *   Forgot Password option is available for subsequent logins.
*   **⚙️ Profile Settings:**
    *   Configure work details: Honorific, Name, Technical Category (Electrical, IT support, Plumbing, etc.), and Bio.
    *   Update account password from settings.
*   **📅 Booking Restriction:**
    *   Technicians do not have access to booking facilities.
*   **🛠️ Ticket Resolution System:**
    *   View a prioritized dashboard of maintenance tickets assigned to them by Admins.
    *   Mark tickets as **Resolved** (with resolution logs) or **Rejected** (with justification).
*   **📢 Announcements:**
    *   View all announcements and official news posted by Admins and Lecturers.

---

### 4. 🛡️ Admin Role
The Command Center gives Administrators complete oversight, resource governance, and auditing control over UniSphere.

*   **🔑 Manual Authentication:**
    *   Secure manual login using system administrator credentials.
    *   Forgot Password recovery feature.
    *   Update admin password from account settings.
*   **🏢 Facility Governance:**
    *   Create, modify, or permanently delete campus facilities (labs, classrooms, arenas).
    *   Download the registered facilities inventory list as a PDF.
*   **✅ Booking Supervision:**
    *   Review, approve, or reject pending booking requests from Students and Lecturers.
    *   Download the master booking registry as a PDF.
*   **👥 User (Student) Management:**
    *   View the full database of registered Users (Students).
    *   View detailed account profiles, deactivate active accounts, or delete users.
    *   Download the student directory list as a PDF.
*   **👔 Staff Management (Lecturers & Technicians):**
    *   Add new Lecturers and Technicians to the system via personal email onboarding.
    *   View list of registered Lecturers and Technicians, inspect account details, deactivate, or delete staff profiles.
    *   Download Lecturer and Technician lists as PDFs.
*   **🔌 Ticket Routing:**
    *   Access the global incoming ticket queue submitted by Students and Lecturers.
    *   Assign tickets to the most appropriate Technician based on technical category and workload.
    *   Download the maintenance ticket status logs as a PDF.

---

## 🔗 Entry Points & Access Rules

| Role | Access Method | Initial Credentials / Sign Up | URL Endpoint |
| :--- | :--- | :--- | :--- |
| **Student** | Manual or Google OAuth | Self-registration / Google Auth | `/login` or `/register` |
| **Admin** | Manual Credentials | Pre-configured Admin account | `/login` or `/admin-registration` |
| **Lecturer** | Manual Credentials | Invited by Admin (Invited via Personal Email) | `/login` (Temporary credential reset required) |
| **Technician**| Manual Credentials | Invited by Admin (Invited via Personal Email) | `/login` (Temporary credential reset required) |

---

## 🛠️ Technology Stack

*   **Frontend:** React.js, Tailwind CSS, Lucide Icons, Recharts (Analytics), TanStack Query, HTML5, Vanilla CSS custom configurations.
*   **Backend:** Java Spring Boot, Maven, Spring Security.
*   **Database:** MongoDB.
*   **Authentication:** JWT (JSON Web Tokens) & Google OAuth 2.0.
*   **Export Engine:** PDF generation engines for analytical directories and system tables.

---

## 🏁 Getting Started

### Backend
1. Navigate to `/backend`
2. Run `mvn spring-boot:run`

### Frontend
1. Navigate to `/frontend`
2. Run `npm install`
3. Run `npm run dev`

---

_Designed & Developed by **Dhanaja V Kulathunga** for a smarter, more connected campus._
