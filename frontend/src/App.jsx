import React, { useState } from 'react';
import Login from './Login';
import Student from './Student';
import Teacher from './Teacher';
import Admin from './Admin';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// Initial Mock Data
const INITIAL_STUDENTS = [
  { id: 'CSE23001', name: 'Vansh Yadav', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'vansh.yadav@college.edu', phone: '+91 98765 43210', attendance: 87, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2048-AX' } },
  { id: 'CSE23002', name: 'Rahul Sharma', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'rahul.sharma@college.edu', phone: '+91 98765 43211', attendance: 91, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2049-BX' } },
  { id: 'CSE23003', name: 'Aman Kumar', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'aman.kumar@college.edu', phone: '+91 98765 43212', attendance: 82, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2050-CX' } },
  { id: 'CSE23004', name: 'Priya Singh', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'priya.singh@college.edu', phone: '+91 98765 43213', attendance: 95, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2051-DX' } },
  { id: 'CSE23005', name: 'Ananya Sharma', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'ananya.s@college.edu', phone: '+91 98765 43214', attendance: 88, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2052-EX' } },
  { id: 'CSE23006', name: 'Rohan Verma', class: 'CSE-3A', course: 'B.Tech CSE', year: '3rd Year', email: 'rohan.v@college.edu', phone: '+91 98765 43215', attendance: 76, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2053-FX' } },
  { id: 'CSE23007', name: 'Neha Gupta', class: 'CSE-3B', course: 'B.Tech CSE', year: '3rd Year', email: 'neha.g@college.edu', phone: '+91 98765 43216', attendance: 89, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2054-GX' } },
  { id: 'CSE23008', name: 'Siddharth Patel', class: 'CSE-3B', course: 'B.Tech CSE', year: '3rd Year', email: 'siddharth.p@college.edu', phone: '+91 98765 43217', attendance: 84, status: 'Active', biometrics: { fingerprint: true, face: true, rfid: true, rfidId: 'RFID-2055-HX' } },
];

const INITIAL_TEACHERS = [
  { id: 'TCH101', name: 'Prof. Rajesh Sharma', department: 'Computer Science', subjects: ['Data Structures', 'Database Systems'], email: 'r.sharma@college.edu', status: 'Active' },
  { id: 'TCH102', name: 'Dr. Meenakshi Sundaram', department: 'Computer Science', subjects: ['Operating Systems'], email: 'm.sundaram@college.edu', status: 'Active' },
  { id: 'TCH103', name: 'Prof. Vikramaditya Sen', department: 'Computer Science', subjects: ['Computer Networks'], email: 'v.sen@college.edu', status: 'Active' },
  { id: 'TCH104', name: 'Dr. Sunita Rao', department: 'Mathematics', subjects: ['Mathematics'], email: 's.rao@college.edu', status: 'Active' },
];

const INITIAL_CLASSES = [
  { id: 'CLS-01', name: 'CSE-3A', year: '3rd Year', section: 'A', totalStudents: 45, classTeacher: 'Prof. Rajesh Sharma' },
  { id: 'CLS-02', name: 'CSE-3B', year: '3rd Year', section: 'B', totalStudents: 42, classTeacher: 'Dr. Meenakshi Sundaram' },
  { id: 'CLS-03', name: 'CSE-2A', year: '2nd Year', section: 'A', totalStudents: 50, classTeacher: 'Prof. Vikramaditya Sen' },
  { id: 'CLS-04', name: 'IT-3A', year: '3rd Year', section: 'A', totalStudents: 40, classTeacher: 'Dr. Sunita Rao' },
];

const INITIAL_SUBJECTS = [
  { id: 'SUB-101', code: 'CS301', name: 'Data Structures', teacher: 'Prof. Rajesh Sharma', class: 'CSE-3A' },
  { id: 'SUB-102', code: 'CS302', name: 'Database Systems', teacher: 'Prof. Rajesh Sharma', class: 'CSE-3A' },
  { id: 'SUB-103', code: 'CS303', name: 'Operating Systems', teacher: 'Dr. Meenakshi Sundaram', class: 'CSE-3A' },
  { id: 'SUB-104', code: 'CS304', name: 'Computer Networks', teacher: 'Prof. Vikramaditya Sen', class: 'CSE-3A' },
  { id: 'SUB-105', code: 'MA301', name: 'Mathematics', teacher: 'Dr. Sunita Rao', class: 'CSE-3A' },
];

const INITIAL_DEVICES = [
  { id: 'DEV-01', name: 'RFID Reader 01', type: 'RFID', status: 'Online', location: 'Lab 301', lastPing: 'Just now' },
  { id: 'DEV-02', name: 'Fingerprint 01', type: 'Fingerprint', status: 'Online', location: 'Main Entrance', lastPing: 'Just now' },
  { id: 'DEV-03', name: 'Fingerprint 02', type: 'Fingerprint', status: 'Online', location: 'CSE Dept', lastPing: 'Just now' },
  { id: 'DEV-04', name: 'Camera 01', type: 'Face Recognition', status: 'Online', location: 'Gate A', lastPing: 'Just now' },
  { id: 'DEV-05', name: 'Camera 02', type: 'Face Recognition', status: 'Offline', location: 'Library', lastPing: '2 hours ago' },
  { id: 'DEV-06', name: 'RFID Reader 02', type: 'RFID', status: 'Online', location: 'Lab 302', lastPing: 'Just now' },
  { id: 'DEV-07', name: 'Camera 03', type: 'Face Recognition', status: 'Online', location: 'Seminar Hall', lastPing: 'Just now' },
];

const INITIAL_ATTENDANCE_RECORDS = [
  { id: 'ATT-101', date: '2026-08-10', subject: 'Database Systems', className: 'CSE-3A', method: 'RFID', time: '09:42 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-100', date: '2026-08-09', subject: 'Operating Systems', className: 'CSE-3A', method: 'Face Recognition', time: '10:05 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-099', date: '2026-08-08', subject: 'Data Structures', className: 'CSE-3A', method: 'Fingerprint', time: '09:03 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-098', date: '2026-08-07', subject: 'Computer Networks', className: 'CSE-3A', method: 'RFID', time: '11:15 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-097', date: '2026-08-06', subject: 'Mathematics', className: 'CSE-3A', method: 'Manual', time: '02:00 PM', status: 'Absent', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-096', date: '2026-08-05', subject: 'Data Structures', className: 'CSE-3A', method: 'Fingerprint', time: '09:00 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  { id: 'ATT-095', date: '2026-08-04', subject: 'Database Systems', className: 'CSE-3A', method: 'RFID', time: '10:00 AM', status: 'Present', studentId: 'CSE23001', studentName: 'Vansh Yadav' },
  // Records for other students
  { id: 'ATT-094', date: '2026-08-10', subject: 'Database Systems', className: 'CSE-3A', method: 'Face Recognition', time: '09:43 AM', status: 'Present', studentId: 'CSE23002', studentName: 'Rahul Sharma' },
  { id: 'ATT-093', date: '2026-08-10', subject: 'Database Systems', className: 'CSE-3A', method: 'Fingerprint', time: '09:44 AM', status: 'Present', studentId: 'CSE23003', studentName: 'Aman Kumar' },
  { id: 'ATT-092', date: '2026-08-10', subject: 'Database Systems', className: 'CSE-3A', method: 'Manual', time: '09:50 AM', status: 'Absent', studentId: 'CSE23006', studentName: 'Rohan Verma' },
];

export default function App() {
  const [role, setRole] = useState('login'); // 'login' | 'student' | 'teacher' | 'admin'
  const [currentUser, setCurrentUser] = useState(null);
  
  // Application Data States
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [attendanceRecords, setAttendanceRecords] = useState(INITIAL_ATTENDANCE_RECORDS);

  // Toast Notification System State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Login handler
  const handleLogin = (selectedRole, userPayload = null) => {
    setRole(selectedRole);
    if (selectedRole === 'student') {
      setCurrentUser(userPayload || students[0]);
      showToast(`Welcome back, Vansh! Logged in as Student.`, `info`);
    } else if (selectedRole === 'teacher') {
      setCurrentUser(userPayload || teachers[0]);
      showToast(`Welcome, Prof. Rajesh Sharma! Logged in as Faculty.`, `info`);
    } else if (selectedRole === 'admin') {
      setCurrentUser({ name: 'System Admin', email: 'admin@campussync.edu', role: 'Administrator' });
      showToast(`Logged in as System Administrator.`, `info`);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setRole('login');
    setCurrentUser(null);
    showToast(`Logged out successfully.`, `info`);
  };

  // Simulated Attendance Recording Callback
  // This updates live attendance records for both Teacher & Student views dynamically!
  const recordAttendance = ({ studentId, studentName, subject, className, method, status = 'Present', time, date }) => {
    const formattedTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date || '10 Aug';

    const newRecord = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      date: formattedDate,
      subject: subject || 'Database Systems',
      className: className || 'CSE-3A',
      method: method || 'RFID',
      time: formattedTime,
      status: status,
      studentId: studentId || 'CSE23001',
      studentName: studentName || 'Vansh Yadav',
    };

    setAttendanceRecords(prev => [newRecord, ...prev]);

    // Recalculate attendance % for student if needed
    if (status === 'Present') {
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, attendance: Math.min(100, s.attendance + 1) };
        }
        return s;
      }));
    }

    showToast(`✓ Attendance Recorded: ${studentName} (${method}) marked ${status} at ${formattedTime}`);
    return newRecord;
  };

  // Management functions for Admin
  const addStudent = (newStudent) => {
    setStudents(prev => [...prev, newStudent]);
    showToast(`Added student: ${newStudent.name} (${newStudent.id})`);
  };

  const addTeacher = (newTeacher) => {
    setTeachers(prev => [...prev, newTeacher]);
    showToast(`Added teacher: ${newTeacher.name}`);
  };

  const addDevice = (newDevice) => {
    setDevices(prev => [...prev, newDevice]);
    showToast(`Registered new device: ${newDevice.name}`);
  };

  const toggleDeviceStatus = (deviceId) => {
    setDevices(prev => prev.map(d => {
      if (d.id === deviceId) {
        const nextStatus = d.status === 'Online' ? 'Offline' : 'Online';
        showToast(`Device ${d.name} is now ${nextStatus}`, nextStatus === 'Online' ? 'success' : 'warning');
        return { ...d, status: nextStatus, lastPing: nextStatus === 'Online' ? 'Just now' : 'Disconnected' };
      }
      return d;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative">
      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-short transition-all duration-300 max-w-md">
          <div className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md ${
            toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700' :
            toast.type === 'warning' ? 'bg-amber-900/90 text-amber-100 border-amber-700' :
            'bg-blue-900/90 text-blue-100 border-blue-700'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />}
            <div className="flex-1 text-sm font-medium pr-2">
              {toast.message}
            </div>
            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {role === 'login' && (
        <Login onLogin={handleLogin} />
      )}

      {role === 'student' && (
        <Student 
          currentUser={currentUser || students[0]} 
          attendanceRecords={attendanceRecords}
          onLogout={handleLogout}
        />
      )}

      {role === 'teacher' && (
        <Teacher 
          currentUser={currentUser || teachers[0]}
          students={students}
          attendanceRecords={attendanceRecords}
          recordAttendance={recordAttendance}
          onLogout={handleLogout}
        />
      )}

      {role === 'admin' && (
        <Admin 
          students={students}
          teachers={teachers}
          classes={classes}
          subjects={subjects}
          devices={devices}
          attendanceRecords={attendanceRecords}
          addStudent={addStudent}
          addTeacher={addTeacher}
          addDevice={addDevice}
          toggleDeviceStatus={toggleDeviceStatus}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
