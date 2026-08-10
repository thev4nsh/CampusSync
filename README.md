# CampusSync — Smart Multi-Modal Attendance System

CampusSync is a modern, full-featured frontend prototype for a multi-modal college attendance system built as a B.Tech Computer Science & Engineering 3rd-year project.

## 🚀 Features & Multi-Modal Architecture

- **Multi-Modal Biometrics & Hardware Simulation**:
  - **Fingerprint Attendance Terminal**: Simulated optical scanner matching minutiae against database.
  - **Face Recognition AI Terminal**: Simulated neural facial recognition camera matching embeddings.
  - **RFID Smart Card Reader**: Simulated 13.56 MHz RFID tap scanner.
  - **Manual Roll Call Roster**: Interactive attendance toggle grid with save functionality.

- **Role-Based Portals & Live Data Consistency**:
  - **Student Portal**: Dashboard with 87% overall attendance, subject breakdown, recent records, history filters, and biometric enrolment profile for **Vansh Yadav (CSE23001)**.
  - **Teacher Portal**: Faculty dashboard, class schedule, interactive multi-modal attendance simulation terminals, live class attendance log feed, class records, and reporting exports for **Prof. Rajesh Sharma**.
  - **Admin Portal**: Institutional dashboard, student/teacher/class/subject management, hardware terminal monitoring network with online/offline toggles, system-wide attendance master logs, and configuration thresholds.
  - **Shared Reactive React State**: Simulating attendance in the Teacher portal immediately updates live logs and updates student stats across the entire session!

---

## 📁 File Structure

```text
CampusSync/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── App.jsx          # Root application state, global data & router
│   │   ├── Login.jsx        # Login page with Student, Teacher & Admin demo accounts
│   │   ├── Student.jsx      # Complete Student interface & history
│   │   ├── Teacher.jsx      # Faculty portal & interactive biometric simulations
│   │   ├── Admin.jsx        # System admin, student/device control center
│   │   ├── main.jsx         # React DOM entry point
│   │   └── index.css        # Tailwind directives & custom scanning animations
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## 🛠️ How to Run Locally

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your web browser.

---

## 🔑 Demo Login Accounts

Click any of the quick demo buttons on the login screen:
- **Student Demo**: Vansh Yadav (`CSE23001`)
- **Teacher Demo**: Prof. Rajesh Sharma (`TCH101`)
- **Admin Demo**: System Administrator (`admin@campussync.edu`)
