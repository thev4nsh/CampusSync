import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, BookOpen, Calendar, Download, FileText, Layers, Loader2, Megaphone, RefreshCw, Sparkles } from 'lucide-react';
import { announcementApi, learningApi, studentApi, teacherApi } from './api';

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export default function Classrooms({ mode, onOpenAnnouncements, onOpenCoursework }) {
  const isTeacher = mode === 'teacher';
  const [classes, setClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [posterUrls, setPosterUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [classRows, announcementRows, materialRows] = await Promise.all([
        isTeacher ? teacherApi.getClasses() : studentApi.getClassrooms(),
        announcementApi.list(),
        learningApi.listMaterials(),
      ]);
      const loadedClasses = Array.isArray(classRows) ? classRows : [];
      if (isTeacher) {
        const fullClasses = await Promise.all(loadedClasses.map(async (row) => {
          try {
            const subjects = await teacherApi.getSubjects(row.id);
            return { ...row, subjects: Array.isArray(subjects) ? subjects : [] };
          } catch {
            return { ...row, subjects: [] };
          }
        }));
        setClasses(fullClasses);
      } else {
        setClasses(loadedClasses);
        setSelectedClass(loadedClasses.length ? String(loadedClasses[0].id) : 'none');
      }
      setAnnouncements(Array.isArray(announcementRows) ? announcementRows : []);
      setMaterials(Array.isArray(materialRows) ? materialRows : []);
    } catch (err) {
      setError(err.message || 'Could not load your classrooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    let active = true;
    const urls = [];
    setPosterUrls({});
    announcements.filter((item) => item.has_poster).forEach((item) => {
      announcementApi.getAttachmentBlob(item.id, 'poster').then((blob) => {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        if (active) setPosterUrls((current) => ({ ...current, [item.id]: url }));
        else URL.revokeObjectURL(url);
      }).catch(() => {});
    });
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [announcements]);

  const className = (classId) => classes.find((row) => String(row.id) === String(classId))?.name
    || announcements.find((row) => String(row.class_id) === String(classId))?.class_name
    || materials.find((row) => String(row.class_id) === String(classId))?.class_name
    || 'Class';

  const subjectOptions = useMemo(() => {
    const rows = new Map();
    const add = (id, name, classId) => {
      if (id == null || !name) return;
      if (selectedClass !== 'all' && String(classId) !== selectedClass) return;
      rows.set(String(id), { id: String(id), name });
    };
    classes.forEach((classRow) => (classRow.subjects || []).forEach((subject) => {
      if (typeof subject === 'string') rows.set(subject, { id: subject, name: subject });
      else add(subject.id, subject.name, classRow.id);
    }));
    announcements.forEach((item) => add(item.subject_id, item.subject_name, item.class_id));
    materials.forEach((item) => add(item.subject_id, item.subject_name, item.class_id));
    return Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, announcements, materials, selectedClass]);

  const contentItems = useMemo(() => {
    const rows = [
      ...announcements.map((item) => ({ ...item, kind: 'announcement', sortDate: item.created_at })),
      ...materials.map((item) => ({ ...item, kind: 'coursework', sortDate: item.created_at })),
    ].filter((item) => (selectedClass === 'all' || String(item.class_id) === selectedClass)
      && (selectedSubject === 'all' || item.subject_id == null || String(item.subject_id) === selectedSubject));
    return rows.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
  }, [announcements, materials, selectedClass, selectedSubject]);

  const downloadBlob = async (blobPromise, filename) => {
    try {
      const blob = await blobPromise;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Could not download this class file.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6" aria-labelledby="classrooms-title">
      <header className="rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100"><Layers className="h-4 w-4" /> CLASSROOMS</span><h2 id="classrooms-title" className="mt-4 text-3xl font-bold">Your classes, together.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{isTeacher ? 'Choose a class to see its announcements and study materials in one stream.' : 'Your class announcements, study materials, and course files are collected in one class stream.'}</p></div>
          <div className="flex gap-2">{isTeacher && <><button type="button" onClick={onOpenAnnouncements} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">Post announcement</button><button type="button" onClick={onOpenCoursework} className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Create coursework</button></>}<button type="button" onClick={refresh} aria-label="Refresh classrooms" className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button></div>
        </div>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="h-4 w-4" />{error}</div>}

      {isTeacher && classes.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button type="button" onClick={() => { setSelectedClass('all'); setSelectedSubject('all'); }} className={'rounded-2xl border p-4 text-left transition ' + (selectedClass === 'all' ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200')}><span className="text-xs font-bold uppercase tracking-wider text-violet-700">Combined view</span><p className="mt-2 text-lg font-bold text-slate-900">All assigned classes</p><p className="mt-1 text-xs text-slate-500">Announcements and coursework together</p></button>
        {classes.map((row) => <button type="button" key={row.id} onClick={() => { setSelectedClass(String(row.id)); setSelectedSubject('all'); }} className={'rounded-2xl border p-4 text-left transition ' + (selectedClass === String(row.id) ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200')}><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned class</span><p className="mt-2 text-lg font-bold text-slate-900">{row.name}</p><p className="mt-1 text-xs text-slate-500">{row.year} · Section {row.section} · {row.subjects?.length || 0} subjects</p></button>)}
      </div>}

      {!isTeacher && classes.map((row) => <div key={row.id} className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4"><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Your active class</p><h3 className="mt-1 text-xl font-bold text-slate-900">{row.name}</h3><p className="mt-1 text-sm text-slate-600">{row.year} · Section {row.section}{row.department ? ` · ${row.department}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{(row.subjects || []).map((subject) => <button type="button" key={subject.id} onClick={() => { setSelectedClass(String(row.id)); setSelectedSubject(String(subject.id)); }} className={'rounded-full border px-3 py-1.5 text-xs font-semibold ' + (selectedSubject === String(subject.id) ? 'border-violet-300 bg-violet-700 text-white' : 'border-violet-200 bg-white text-violet-800')}>{subject.name}{subject.code ? ` · ${subject.code}` : ''}</button>)}</div></div>)}

      {!isTeacher && classes.length === 0 && !loading && <div className={card + ' p-8 text-center text-sm text-slate-500'}>No active class is linked to your student account yet.</div>}

      <div className={card + ' overflow-hidden'}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Class stream</p><h3 className="mt-1 text-xl font-bold text-slate-900">Announcements & study materials</h3><p className="mt-1 text-xs text-slate-500">{selectedClass === 'all' ? 'Across all classes you teach' : className(selectedClass)}</p></div><div className="flex gap-2">{isTeacher && <label className="sr-only" htmlFor="classroom-class-filter">Select a class</label>}{isTeacher && <select id="classroom-class-filter" value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setSelectedSubject('all'); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All assigned classes</option>{classes.map((row) => <option key={row.id} value={String(row.id)}>{row.name}</option>)}</select>}<label className="sr-only" htmlFor="classroom-subject-filter">Filter by subject</label><select id="classroom-subject-filter" value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All subjects</option>{subjectOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div></div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your class stream…</div> : contentItems.length === 0 ? <div className="p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-300" /><h4 className="mt-3 font-bold text-slate-800">Nothing shared here yet</h4><p className="mt-1 text-sm text-slate-500">Announcements and coursework for this selection will appear in this stream.</p></div> : <div className="divide-y divide-slate-100">{contentItems.map((item) => <article key={item.kind + item.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + (item.kind === 'announcement' ? 'bg-amber-50 text-amber-800' : 'bg-violet-50 text-violet-800')}>{item.kind === 'announcement' ? 'Announcement' : 'Coursework'}</span><span className="text-xs font-semibold text-slate-500">{className(item.class_id)}</span>{item.subject_name && <span className="text-xs text-slate-400">· {item.subject_name}</span>}</div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">{item.kind === 'announcement' && item.has_poster && posterUrls[item.id] && <img src={posterUrls[item.id]} alt={`${item.title} poster`} className="max-h-44 w-full rounded-xl bg-slate-100 object-contain sm:w-56" />}<div className="min-w-0 flex-1"><h4 className="text-lg font-bold text-slate-900">{item.title}</h4>{item.event_date && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700"><Calendar className="h-3.5 w-3.5" />{new Date(item.event_date + 'T00:00:00').toLocaleDateString()} · Test/event</p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.kind === 'announcement' ? item.message : (item.content?.trim() || 'Your teacher shared attached class files for this coursework.')}</p><p className="mt-3 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div></div>
          {item.kind === 'coursework' && item.attachments?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{item.attachments.map((file) => <button type="button" key={file.id} onClick={() => downloadBlob(learningApi.getAttachmentBlob(item.id, file.id), file.filename)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-800"><Download className="h-4 w-4" />{file.filename}</button>)}</div>}
          {item.kind === 'announcement' && <div className="mt-4 flex flex-wrap gap-2">{(item.has_attachment || item.has_pdf) && <button type="button" onClick={() => downloadBlob(announcementApi.getAttachmentBlob(item.id, item.attachment_filename ? 'file' : 'pdf'), item.attachment_filename || item.pdf_filename || 'class-file')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><Download className="h-4 w-4" />{item.attachment_filename || item.pdf_filename || 'Download attachment'}</button>}{item.link_url && <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{item.link_label || 'Open link'}</a>}</div>}
          {item.kind === 'coursework' && item.ai_ready && <button type="button" onClick={onOpenCoursework} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-700 hover:underline"><Sparkles className="h-4 w-4" />Open AI study tools</button>}
        </article>)}</div>}
      </div>
      {!isTeacher && <button type="button" onClick={onOpenAnnouncements} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><Megaphone className="h-4 w-4" />Open class announcement feed</button>}
    </section>
  );
}
