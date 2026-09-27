# CampusSync Backend — FastAPI REST Service

> **Smart Multi-Modal Attendance & Campus Management System**  
> High-performance Python/FastAPI backend service with PostgreSQL, SQLAlchemy ORM, Alembic migrations, JWT authentication, and multi-modal IoT terminal integration.

---

## 🏛 System Architecture

The CampusSync backend operates as the central institutional data authority, securely processing attendance from web portals and physical IoT terminals:

```text
               Web Portals (Student / Teacher / Admin)
                               │
                               ▼ [HTTPS / REST]
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Gateway                         │
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

## 📁 Folder Structure

```text
backend/
├── app/
│   ├── __init__.py          # Package initialization
│   ├── main.py              # FastAPI application instance, CORS, middleware, and router mounts
│   ├── database.py          # SQLAlchemy engine, sessionmaker, and get_db dependency
│   ├── config.py            # Pydantic BaseSettings configuration loader (.env)
│   ├── models.py            # Relational database models & enum definitions
│   ├── schemas.py           # Pydantic v2 request/response validation schemas
│   ├── security.py          # Bcrypt password hashing & JWT token generators/decoders
│   ├── dependencies.py      # OAuth2 token extraction & Role-Based Access Control (RBAC) guards
│   │
│   ├── routers/             # Domain-specific REST API routers
│   │   ├── __init__.py
│   │   ├── auth.py          # Login, Token Refresh, Forgot Password, and /auth/me
│   │   ├── students.py      # Student dashboard, attendance history, and profile
│   │   ├── teachers.py      # Faculty dashboard, class schedule, roster, and reports
│   │   ├── admin.py         # Institutional CRUD for students, teachers, classes, subjects, settings
│   │   ├── attendance.py    # Sessions, live attendance streams, manual & device ingest channels
│   │   ├── devices.py       # Multi-modal hardware terminal monitor and status updates
│   │   └── reports.py       # Analytical reports for attendance, classes, and subjects
│   │
│   └── services/            # Core business logic services
│       ├── __init__.py
│       ├── attendance_service.py # Unified 8-step attendance validation pipeline
│       └── device_service.py     # Hardware credential-to-student identity resolution
│
├── alembic/                 # Database migration scripts
│   ├── env.py               # Alembic environment and SQLAlchemy metadata hook
│   ├── script.py.mako       # Migration template
│   └── versions/            # Versioned migration files
│       └── 0001_initial_schema.py
│
├── tests/                   # Automated pytest suite (in-memory SQLite)
│   ├── __init__.py
│   ├── conftest.py          # Fixtures, test database session, and client
│   ├── test_auth.py         # Authentication tests
│   ├── test_rbac.py         # Role-based permission restriction tests
│   └── test_attendance.py   # Live session, RFID scan, and duplicate prevention tests
│
├── seed.py                  # Optional explicit database initialization script
├── alembic.ini              # Alembic migration configuration
├── requirements.txt         # Production Python dependencies
├── .env.example             # Environment variable template
├── .gitignore               # Python and secret exclusion rules
└── README.md                # Backend service documentation
```

---

## ⚙️ Requirements & Installation

* **Python:** 3.11 or 3.12
* **PostgreSQL:** 15 or higher

### Local Environment Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create local environment configuration
cp .env.example .env
```

---

## 🌐 Environment Variables

Configure your `backend/.env` file:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:YourPassword@localhost:5432/campus_sync

# JWT Signing Secret & Expiration
JWT_SECRET_KEY=generate_a_secure_256bit_hex_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application Settings
ENVIRONMENT=development
APP_NAME=CampusSync API
DEBUG=true

# Allowed CORS Origins (Frontend URLs)
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 🗄 Database Setup & Migrations

```bash
# Apply initial schema migration to PostgreSQL
alembic upgrade head

# (Optional) Seed the initial master administrator account & sample classes:
python seed.py --init-all
# Default credentials created:
# Email: admin@campussync.edu
# Password: Admin@123
```

---

## 🚀 Running the Server

```bash
# Start FastAPI development server with hot-reload:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Interactive API Documentation
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Endpoint:** [http://localhost:8000/](http://localhost:8000/)

---

## 🧪 Running Automated Tests

The test suite runs against an isolated in-memory SQLite database without requiring live PostgreSQL credentials:

```bash
pytest -v
```

---

## 🛡 Attendance Validation Pipeline & Duplicate Prevention

All attendance channels (RFID, Fingerprint, Face Recognition, Manual) pass through `AttendanceService.process_attendance`:

1. **Student Verification:** Confirms student exists and account is active.
2. **Session Verification:** Confirms attendance session exists and status is `ACTIVE`.
3. **Enrollment Check:** Verifies student is enrolled in the session's class.
4. **Duplicate Attendance Check:** Checks for existing record in database for the same student and session.
5. **Database Constraint:** An explicit `UniqueConstraint("student_id", "session_id")` on `attendance_records` enforces idempotency at the database level.
6. **Status Determination:** Sets `PRESENT`, `LATE`, or `ABSENT`.
7. **Audit Record:** Persists record with timestamp, verification method, and originating device ID.

---

## 🔒 Security Practices
* **No Plaintext Passwords:** Passwords hashed with `bcrypt` (work factor 12).
* **JWT Expiration:** Short-lived access tokens with secure refresh token rotation.
* **No Biometric Images Stored:** Fingerprint template indices and face embedding reference IDs stored only; raw biometrics are never saved.
* **CORS Whitelisting:** Restricted to configured frontend domains.
* **Database Isolation:** Database port `5432` is kept internal; external access is strictly via FastAPI REST endpoints.
