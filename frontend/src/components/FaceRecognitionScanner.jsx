import React, { useEffect, useRef, useState } from 'react';
import { Camera, ScanFace, ShieldCheck } from 'lucide-react';
import { teacherApi } from '../api/api';

export default function FaceRecognitionScanner({ sessionId, onRecorded }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => { if (open && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [open]);
  const start = async () => {
    setMessage(''); setCandidate(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setOpen(true);
    } catch (e) { setMessage(e.message || 'Camera access was not available.'); }
  };
  const stop = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setOpen(false); setCandidate(null); setConfirm(false); };
  const scan = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) { setMessage('Wait for the camera preview, then scan.'); return; }
    setBusy(true); setMessage(''); setCandidate(null); setConfirm(false);
    try {
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      const result = await teacherApi.recognizeFace(sessionId, blob);
      if (result.matched) setCandidate(result); else setMessage(result.message || 'No enrolled student matched.');
    } catch (e) { setMessage(e.message || 'Face scan failed.'); }
    finally { setBusy(false); }
  };
  const record = async () => {
    if (!candidate || !confirm) return;
    setBusy(true);
    try {
      const result = await teacherApi.confirmFaceAttendance({ sessionId, studentId: candidate.student_id, matchToken: candidate.match_token, confirmInPerson: true });
      setMessage(`${result.student_name || candidate.student_name}: ${result.message || 'Attendance recorded.'}`);
      setCandidate(null); setConfirm(false); onRecorded?.(result);
    } catch (e) { setMessage(e.message || 'Attendance could not be recorded.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-emerald-700/30 bg-slate-900 p-5 space-y-4">
    <div className="flex items-start gap-3"><Camera className="w-5 h-5 text-emerald-400 mt-0.5" /><div><h5 className="font-bold text-white">Face assisted attendance</h5><p className="text-sm text-slate-300 mt-1">Scan one person at a time. Matching suggests a candidate; you verify the student in person and confirm the mark. This prototype has no liveness or anti-spoofing check.</p></div></div>
    {open && <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-72 rounded-xl bg-black object-cover" />}
    <div className="flex flex-wrap gap-2">{!open ? <button onClick={start} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold flex gap-2 items-center"><Camera className="w-4 h-4" />Enable camera</button> : <><button onClick={scan} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold flex gap-2 items-center disabled:opacity-50"><ScanFace className="w-4 h-4" />{busy ? 'Checking…' : 'Scan person'}</button><button onClick={stop} className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold">Stop camera</button></>}</div>
    {candidate && <div className="rounded-xl bg-slate-800 p-4 space-y-3"><p className="text-white font-bold">Possible match: {candidate.student_name}</p><p className="text-xs text-slate-300">Similarity distance {candidate.distance} (configured threshold {candidate.threshold}). Matching can be wrong.</p><label className="flex gap-2 text-sm text-slate-200"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I verified this student in person and confirm this attendance mark.</label><button onClick={record} disabled={!confirm || busy} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"><ShieldCheck className="w-4 h-4 inline mr-2" />Confirm attendance</button></div>}
    <p aria-live="polite" className="text-sm text-slate-300">{message}</p>
  </section>;
}
