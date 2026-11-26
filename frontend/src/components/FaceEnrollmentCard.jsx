import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck, Trash2 } from 'lucide-react';
import { studentApi } from '../api/api';

export default function FaceEnrollmentCard() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState({ sample_count: 0, required_samples: 3, face_enrolled: false, consented: false });
  const [consent, setConsent] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try { setStatus(await studentApi.getFaceEnrollmentStatus()); } catch (e) { setMessage(e.message || 'Could not load enrollment status.'); }
  };
  useEffect(() => { refresh(); return () => streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => { if (cameraOpen && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [cameraOpen]);

  const startCamera = async () => {
    setMessage('');
    if (!consent && !status.consented) { setMessage('Please read and accept the optional face-template consent first.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (e) { setMessage(e.message || 'Camera access was not available.'); }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setMessage('Wait for the camera preview, then try again.'); return; }
    setBusy(true); setMessage('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      const result = await studentApi.addFaceEnrollmentSample(blob, consent || status.consented);
      setStatus((current) => ({ ...current, ...result, consented: true }));
      setMessage(result.message);
    } catch (e) { setMessage(e.message || 'Could not save this sample.'); }
    finally { setBusy(false); }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOpen(false); };
  const revoke = async () => {
    setBusy(true);
    try { await studentApi.revokeFaceEnrollment(); setStatus({ sample_count: 0, required_samples: 3, face_enrolled: false, consented: false }); setConsent(false); setMessage('Enrollment and consent removed.'); }
    catch (e) { setMessage(e.message || 'Could not remove enrollment.'); }
    finally { setBusy(false); }
  };

  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
    <div className="flex items-start gap-3"><div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg"><Camera className="w-5 h-5" /></div><div>
      <h3 className="font-bold text-slate-900">Optional face attendance</h3>
      <p className="text-sm text-slate-600 mt-1">Enroll three camera samples. Only encrypted face templates are stored; camera images are processed for enrollment and discarded.</p>
    </div></div>
    <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Enrollment</span><span className="font-semibold text-slate-800">{status.face_enrolled ? 'Ready' : `${status.sample_count || 0} of 3 samples`}</span></div>
    {!status.consented && <label className="flex gap-2 text-sm text-slate-700"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />I freely consent to creating an encrypted face template for attendance. I can remove it at any time and use another attendance method.</label>}
    {cameraOpen && <div className="space-y-3"><video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 rounded-xl bg-slate-950 object-cover" /><div className="flex gap-2"><button onClick={capture} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Capture sample'}</button><button onClick={stopCamera} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold">Close camera</button></div></div>}
    {!cameraOpen && !status.face_enrolled && <button onClick={startCamera} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-2"><Camera className="w-4 h-4" />Open camera</button>}
    {status.face_enrolled && <div className="flex items-center gap-2 text-sm text-emerald-800"><ShieldCheck className="w-4 h-4" />Enrolled. Teacher confirmation is required for every attendance mark.</div>}
    {status.consented && <button onClick={revoke} disabled={busy} className="flex items-center gap-2 text-sm text-rose-700 font-semibold"><Trash2 className="w-4 h-4" />Remove face enrollment and consent</button>}
    <p aria-live="polite" className="text-sm text-slate-600">{message}</p>
  </section>;
}
