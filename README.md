# CampusSync — Smart Multi-Modal Attendance & Campus Management System

> **B.Tech Computer Science & Engineering (3rd Year Major Project)**  
> Production-ready, enterprise-grade architecture for institutional attendance automation, multi-modal biometric device network integration, and campus management.

---

## 📌 Project Overview

**CampusSync** is an institutional campus attendance and administration management system designed to eliminate proxy attendance, streamline faculty administration, and provide verifiable audit logs.

The platform transforms legacy paper attendance into an automated, multi-modal terminal network supporting **RFID Smart Cards (13.56 MHz)**, **Optical/Capacitive Fingerprint Sensors**, and **Edge AI Face Recognition Streams** linked to a centralized **FastAPI** backend and **PostgreSQL** database.

```text
  Web Portals (Student / Teacher / Admin)
                 │
                 ▼ [HTTPS / REST]
┌─────────────────────────────────────────────────────────────┐
│                 CampusSync FastAPI Gateway                  │
│  ├─ JWT Bearer Authentication & RBAC Authorization Guard   │
│  ├─ Pydantic v2 Schema Validation & Defensive Serialization│
│  ├─ Central Attendance Service (8-Step Pipeline)            │
│  └─ CORS & Exception Middleware                             │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
               ▼                              │ [IoT REST / HTTPS]
┌──────────────────────────────┐ ┌────────────┴───────────────┐
│     PostgreSQL Database      │ │ Physical Terminal Network  │
│  (ACID Relational Storage)   │ │  ├─ ESP32 + RFID Reader    │
│                              │ │  ├─ Biometric Fingerprint  │
│                              │ │  └─ Edge AI Face Camera    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 📁 Repository Structure

```text
CampusSync/
├── frontend/                # React 18 + Vite 6 + Tailwind CSS SPA
│   ├── src/
│   │   ├── api.js           # API abstraction layer & JWT session storage
│   │   ├── App.jsx          # Role-based router & toast notifications
│   │   ├── Login.jsx        # Institutional login form (JWT)
│   │   ├── Student.jsx      # Student dashboard & biometric profile
│   │   ├── Teacher.jsx      # Faculty terminal & live attendance feed
│   │   ├── Admin.jsx        # Campus administration & terminal registry
│   │   └── index.css        # Tailwind styles & skeleton animations
│   ├── .env.example         # Frontend environment template
│   └── package.json         # NPM configuration
│
├── backend/                 # FastAPI + SQLAlchemy + Alembic REST API
│   ├── app/
│   │   ├── main.py          # FastAPI application & router mounting
│   │   ├── config.py        # Pydantic BaseSettings (.env loading)
│   │   ├── database.py      # SQLAlchemy sessionmaker & dependency
│   │   ├── models.py        # PostgreSQL relational database models
│   │   ├── schemas.py       # Pydantic v2 request/response schemas
│   │   ├── security.py      # Bcrypt password hashing & JWT handlers
│   │   ├── dependencies.py  # OAuth2 bearer token extraction & RBAC
│   │   ├── routers/         # REST API routers (auth, students, teachers, admin, attendance, devices, reports)
│   │   └── services/        # Attendance service & device resolver
│   ├── alembic/             # Database migration versions
│   ├── tests/               # Automated pytest suite (in-memory SQLite)
│   ├── seed.py              # Optional explicit database initialization script
│   ├── alembic.ini          # Alembic configuration
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Backend environment template
│   └── README.md            # Backend technical documentation
│
├── TODO.txt                 # Manual setup checklist & verification guide
└── README.md                # Root project documentation
```

---

## 🚀 Current Phase 1 Deliverables

### 1. Frontend Client
* **JWT Institutional Login:** Unified authentication form without demo selectors; role determined strictly by backend JWT response.
* **Role Portals:** Complete dashboards for **Students**, **Teachers**, and **Administrators**.
* **Defensive UI States:** Shimmer skeletons, empty data handling, and error states with manual retry buttons.
* **Hardware Waiting Terminal:** Live terminal status for incoming RFID taps, biometric scans, and recognition streams.

### 2. FastAPI Backend & PostgreSQL Storage
* **Relational Schema:** Models for `users`, `students`, `teachers`, `classes`, `subjects`, `teacher_subject_assignments`, `attendance_sessions`, `attendance_records`, `devices`, `rfid_cards`, `biometric_identities`, and `system_settings`.
* **Alembic Migrations:** Production database migrations (`0001_initial_schema.py`).
* **Central Attendance Service:** Unified 8-step pipeline with application and database-level duplicate prevention (`UniqueConstraint("student_id", "session_id")`).
* **Automated Tests:** 12 unit and integration tests covering auth, RBAC, session lifecycles, and duplicate prevention.

---

## 🔮 Future Expansion (Phase 2 & Beyond)

* **Mobile App:** Flutter / React Native cross-platform application for students and faculty.
* **Smart Timetable:** Automated course schedule and room conflict management.
* **Assignment Portal:** Digital assignment submission and faculty grading workflow.
* **Notices & Bulletins:** Targeted department broadcasts with push notifications.
* **Examination Results:** Semester grades and transcript generation.
* **Leave Management:** Digital student and faculty leave approval workflows.
* **AI Campus Assistant:** Retrieval-Augmented Generation (RAG) assistant for college queries.

---

## 🛠 Quick Start Guide

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Configure DATABASE_URL in backend/.env

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit:
* **Frontend Application:** [http://localhost:5173](http://localhost:5173)
* **Backend Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📄 Documentation & Action Checklist
For the step-by-step checklist of manual software installation, database setup, and college server deployment, refer to [`TODO.txt`](file:///C:/Users/LOKI/Documents/CampusSync/TODO.txt).

---

## ⚖️ License
Academic Major Project — Department of Computer Science & Engineering (2026). All Rights Reserved.
