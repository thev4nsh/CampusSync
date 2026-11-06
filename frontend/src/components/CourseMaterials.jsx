import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { learningApi, teacherApi } from '../api/api';

const cardClass = 'rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]';

function ErrorNotice({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function CourseMaterials({ mode, showToast }) {
  const isTeacher = mode === 'teacher';
  const [materials, setMaterials] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiStatus, setAiStatus] = useState(null);

  const refreshAiStatus = () => learningApi.status().then(setAiStatus).catch(() => {});

  const loadMaterials = async (preferredId = '') => {
    setLoading(true);
    setError('');
    try {
      const rows = await learningApi.listMaterials();
      const items = Array.isArray(rows) ? rows : [];
      setMaterials(items);
      const nextId = items.some((item) => item.id === preferredId) ? preferredId : (items[0]?.id || '');
      setSelectedId(nextId);
      if (!nextId) setDetail(null);
    } catch (err) {
      setError(err.message || 'Could not load course materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    refreshAiStatus();
    if (isTeacher) {
      teacherApi.getClasses()
        .then((rows) => setClasses(Array.isArray(rows) ? rows : []))
        .catch((err) => setError(err.message || 'Could not load assigned classes.'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setDetail(null);
      return () => { active = false; };
    }
    setDetail(null);
    setDetailLoading(true);
    setSummary('');
    setAnswer(null);
    setQuestion('');
    setAiError('');
    learningApi.getMaterial(selectedId)
      .then((item) => { if (active) setDetail(item); })
      .catch((err) => { if (active) setAiError(err.message || 'Could not open this material.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const chooseClass = async (value) => {
    setClassId(value);
    setSubjectId('');
    setSubjects([]);
    setError('');
    if (!value) return;
    try {
      const rows = await teacherApi.getSubjects(value);
      setSubjects(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || 'Could not load this class’s subjects.');
    }
  };

  const createMaterial = async (event) => {
    event.preventDefault();
    setError('');
    setFileError('');
    if (!files.length && content.trim().length < 20 && !videoUrl.trim()) {
      setError('Add at least 20 characters of notes, attach a file, or add a YouTube link.');
      return;
    }
    setSaving(true);
    try {
      let created;
      if (files.length) {
        const form = new FormData();
        form.append('title', title.trim());
        form.append('class_id', classId);
        form.append('subject_id', subjectId);
        form.append('content', content.trim());
        form.append('source_url', videoUrl.trim());
        files.forEach((file) => form.append('files', file));
        created = await learningApi.uploadMaterials(form);
      } else {
        created = await learningApi.createMaterial({
          class_id: Number(classId),
          subject_id: Number(subjectId),
          title: title.trim(),
          content_type: 'text/markdown',
          content: content.trim(),
          source_url: videoUrl.trim() || null,
        });
      }
      setTitle('');
      setContent('');
      setVideoUrl('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setComposerOpen(false);
      showToast?.('Coursework shared with the selected class.', 'success');
      await loadMaterials(created.id);
    } catch (err) {
      setError(err.message || 'Could not publish these notes.');
    } finally {
      setSaving(false);
    }
  };

  const chooseFiles = (selected) => {
    setFileError('');
    const chosen = Array.from(selected || []);
    const allowed = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md|csv|rtf|srt|vtt|png|jpe?g|webp)$/i;
    if (chosen.length > 5) {
      setFileError('Choose up to 5 files for one coursework post.');
      return;
    }
    if (chosen.some((file) => !allowed.test(file.name) || file.size > 20 * 1024 * 1024)) {
      setFileError('Use supported document or image files smaller than 20 MB each.');
      return;
    }
    setFiles(chosen);
  };

  const downloadAttachment = async (material, attachment) => {
    setAiError('');
    try {
      const blob = await learningApi.getAttachmentBlob(material.id, attachment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAiError(err.message || 'Could not download this course file.');
    }
  };

  const generateSummary = async () => {
    if (!selectedId) return;
    setSummaryLoading(true);
    setAiError('');
    try {
      const result = await learningApi.summarize(selectedId);
      setSummary(result.summary || 'No summary was returned.');
      refreshAiStatus();
    } catch (err) {
      setAiError(err.message || 'Could not generate a summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const askQuestion = async (event) => {
    event.preventDefault();
    if (!selectedId || question.trim().length < 3) return;
    setAnswerLoading(true);
    setAiError('');
    try {
      setAnswer(await learningApi.ask(selectedId, question.trim()));
      refreshAiStatus();
    } catch (err) {
      setAiError(err.message || 'Could not answer this question.');
    } finally {
      setAnswerLoading(false);
    }
  };

  const classNameFor = (id) => classes.find((item) => String(item.id) === String(id))?.name || '';
  const filteredMaterials = materials.filter((item) => item.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <section className="mx-auto max-w-7xl space-y-6" aria-labelledby="materials-heading">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-14 -top-24 -z-10 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> CAMPUSSYNC · AI LEARNING
            </span>
            <h2 id="materials-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {isTeacher ? 'Post coursework for each class.' : 'Your classwork, files, and AI study help.'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              {isTeacher
                ? 'Choose a class and subject, add instructions, attach handouts, or share a YouTube lecture with captions. Students see only coursework for their class.'
                : 'Open the files and instructions your teachers shared. Summarize readable notes or ask questions grounded in the course material.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><BookOpen className="h-5 w-5" /></div>
            <div><p className="text-xl font-bold leading-none">{materials.length}</p><p className="mt-1 text-xs text-slate-400">course materials</p></div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Answers stay grounded in the selected notes</span>
          <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Source excerpts included</span>
        </div>
      </header>

      {error && <ErrorNotice>{error}</ErrorNotice>}
      {aiStatus?.configured === false && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">AI study help is not enabled yet. Ask your campus administrator to configure it.</div>}
      {aiStatus?.configured && <p className="-mt-3 text-right text-xs text-slate-500">AI study requests today: {aiStatus.requests_used_today} of {aiStatus.daily_request_limit}</p>}

      {isTeacher && composerOpen && (
        <form onSubmit={createMaterial} className={cardClass + ' space-y-5 p-5 sm:p-7'}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Create classwork</p><h3 className="mt-1 text-xl font-bold text-slate-900">Post coursework</h3><p className="mt-1 text-sm text-slate-500">Choose the class and subject, add instructions, and attach up to five files.</p></div>
            <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close note form" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Class
              <select required value={classId} onChange={(event) => chooseClass(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                <option value="">Choose an assigned class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.year} · Section {item.section}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Subject
              <select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!classId || !subjects.length} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50">
                <option value="">{classId ? 'Choose a subject' : 'Choose a class first'}</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ' · ' + item.code : ''}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">Title
            <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Week 4 — Binary search trees" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">YouTube lecture link <span className="font-normal text-slate-400">(optional)</span>
            <input type="url" maxLength={500} value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            <span className="block text-xs font-normal text-slate-500">For an AI video summary, attach the video captions (.srt or .vtt) or paste its transcript in the notes.</span>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">Instructions or notes <span className="font-normal text-slate-400">(optional with a file or video link)</span>
            <textarea required={!files.length && !videoUrl.trim()} minLength={!files.length && !videoUrl.trim() ? 20 : undefined} maxLength={100000} rows={5} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Tell students what to read, complete, or prepare… Paste a video transcript here to make it available to the AI." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal leading-relaxed outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            <span className="block text-right text-xs font-normal text-slate-400">{content.length.toLocaleString()} / 100,000 characters</span>
          </label>
          <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"><UploadCloud className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-800">Attach files from your computer</p><p className="mt-1 text-xs leading-5 text-slate-500">PDF, Word, PowerPoint, Excel, text, subtitles, RTF, or image · up to 20 MB each</p></div></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-100"><UploadCloud className="h-4 w-4" /> Choose files<input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.rtf,.srt,.vtt,.png,.jpg,.jpeg,.webp" onChange={(event) => chooseFiles(event.target.files)} className="sr-only" /></label></div>
            {files.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{files.map((file, index) => <li key={file.name + file.size + index} className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-violet-700" /><span className="min-w-0 flex-1 truncate font-medium text-slate-700">{file.name}</span><span className="shrink-0 text-slate-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" onClick={() => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Remove ${file.name}`} className="rounded px-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700">×</button></li>)}</ul>}
            {fileError && <p role="alert" className="mt-3 text-sm text-rose-700">{fileError}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setComposerOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || (!files.length && content.trim().length < 20 && !videoUrl.trim()) || !classId || !subjectId} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Sharing…' : 'Share with class'}</button>
          </div>
        </form>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className={cardClass + ' overflow-hidden'} aria-label="Course material library">
            <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Classwork</p><h3 className="mt-1 text-lg font-bold text-slate-900">Coursework library</h3></div><button type="button" onClick={() => loadMaterials()} aria-label="Refresh coursework" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button></div>
            <label className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-violet-400 focus-within:bg-white">
              <Search className="h-4 w-4 text-slate-400" /><span className="sr-only">Search course notes</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Find a note…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="text-xs font-semibold text-violet-700">Clear</button>}
            </label>
          </div>
          {isTeacher && <div className="border-b border-slate-100 p-4"><button type="button" onClick={() => setComposerOpen((open) => !open)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"><Plus className="h-4 w-4" /> Create coursework</button></div>}
          {loading ? <div className="space-y-3 p-4" aria-label="Loading course materials">{[0, 1, 2].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-2xl bg-slate-100" />)}</div>
            : filteredMaterials.length === 0 ? <div className="px-5 py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText className="h-5 w-5" /></div><p className="mt-3 text-sm font-bold text-slate-800">{materials.length ? 'No matching coursework' : 'No coursework shared yet'}</p><p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-slate-500">{materials.length ? 'Try another title.' : (isTeacher ? 'Create coursework with instructions or attached files.' : 'Coursework shared with your class will appear here.')}</p></div>
            : <ul className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">{filteredMaterials.map((item) => <li key={item.id}><button type="button" onClick={() => setSelectedId(item.id)} aria-current={selectedId === item.id ? 'true' : undefined} className={'group flex w-full items-start gap-3.5 p-4 text-left transition hover:bg-slate-50 sm:p-5 ' + (selectedId === item.id ? 'bg-violet-50/70' : '')}><span className={'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (selectedId === item.id ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700')}><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{item.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.class_name || classNameFor(item.class_id) || 'Course material'}{item.subject_name ? ` · ${item.subject_name}` : ''}</span><span className="mt-2 block text-[11px] text-slate-400">{item.attachments?.length || 0} file{item.attachments?.length === 1 ? '' : 's'} · Updated {new Date(item.updated_at).toLocaleDateString()}</span></span><ArrowUpRight className={'mt-1 h-4 w-4 shrink-0 transition ' + (selectedId === item.id ? 'text-violet-700' : 'text-slate-300 group-hover:text-violet-600')} /></button></li>)}</ul>}
        </aside>

        <div className="min-w-0 space-y-5">
          {!selectedId && !loading ? <div className={cardClass + ' flex min-h-[420px] flex-col items-center justify-center p-8 text-center'}><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles className="h-6 w-6" /></div><h3 className="mt-5 text-xl font-bold text-slate-900">Your course copilot is ready</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{isTeacher ? 'Publish notes for an assigned class to give students an AI-powered study companion.' : 'When your teachers share notes, you can summarize them or ask questions here.'}</p></div> : <>
            <section className={cardClass + ' overflow-hidden'}>
              {detailLoading ? <div className="space-y-4 p-6"><div className="h-5 w-24 animate-pulse rounded bg-slate-100" /><div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /></div>
                : detail ? <><div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800"><BookOpen className="h-3.5 w-3.5" /> {detail.class_name || classNameFor(detail.class_id) || 'Course material'}{detail.subject_name ? ` · ${detail.subject_name}` : ''}</span><h3 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{detail.title}</h3><p className="mt-2 text-sm text-slate-500">Version {detail.version} · Updated {new Date(detail.updated_at).toLocaleString()}</p></div><button type="button" onClick={generateSummary} disabled={summaryLoading || !detail.ai_ready || aiStatus?.configured === false || (aiStatus?.requests_used_today >= aiStatus?.daily_request_limit)} title={!detail.ai_ready ? 'No readable text was found in this post.' : aiStatus?.configured === false ? 'AI study help is not enabled.' : undefined} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/15 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{summaryLoading ? 'Building summary…' : summary ? 'Refresh summary' : detail.source_url ? 'Summarize video' : 'Summarize notes'}</button></div>
                  {detail.source_url && <div className="border-t border-slate-100 px-5 py-4 sm:px-7"><a href={detail.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100"><ArrowUpRight className="h-4 w-4" /> Open YouTube lecture</a>{!detail.ai_ready && <p className="mt-2 text-xs text-slate-500">Attach captions (.srt or .vtt), or paste the transcript in the notes, to enable AI summaries.</p>}</div>}
                  {!!detail.attachments?.length && <div className="border-t border-slate-100 px-5 py-4 sm:px-7"><p className="mb-3 text-sm font-bold text-slate-800">Attached classwork files</p><ul className="grid gap-2 sm:grid-cols-2">{detail.attachments.map((attachment) => <li key={attachment.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><FileText className="h-5 w-5 shrink-0 text-violet-700" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{attachment.filename}</span><span className="text-xs text-slate-500">{(attachment.size_bytes / (1024 * 1024)).toFixed(1)} MB</span></span><button type="button" onClick={() => downloadAttachment(detail, attachment)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:text-violet-800"><Download className="h-4 w-4" /> Download</button></li>)}</ul></div>}
                  {detail.ai_ready ? <div className="border-t border-slate-100 px-5 py-4 sm:px-7"><details><summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-violet-700">Open extracted source notes</summary><div className="mt-3 max-h-80 overflow-y-auto rounded-2xl bg-slate-50 p-4"><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-600">{detail.content}</pre></div></details></div> : <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">Files are ready to download. AI study tools are available when readable text is present; scanned PDFs and image-only files need OCR support.</div>}
                  {summary && <div className="mx-5 mb-5 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 sm:mx-7 sm:mb-7 sm:p-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-800"><Sparkles className="h-4 w-4" /> AI-generated summary</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{summary}</p></div>}
                </> : <div className="p-6"><ErrorNotice>{aiError || 'Could not open this material.'}</ErrorNotice></div>}
            </section>

            {detail?.ai_ready && <section className={cardClass + ' overflow-hidden'}>
              <div className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><MessageCircle className="h-5 w-5" /></div><div><h3 className="text-base font-bold text-slate-900">Ask your course copilot</h3><p className="mt-1 text-sm leading-5 text-slate-500">Questions are answered from this note, with matching excerpts you can check.</p></div></div>
              <div className="p-5 sm:p-6">
                <form onSubmit={askQuestion} className="flex flex-col gap-2 sm:flex-row"><label htmlFor="course-question" className="sr-only">Ask a question about this material</label><input id="course-question" value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={2000} placeholder="For example: What are the main steps in this process?" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" /><button type="submit" disabled={answerLoading || question.trim().length < 3 || aiStatus?.configured === false || (aiStatus?.requests_used_today >= aiStatus?.daily_request_limit)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{answerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{answerLoading ? 'Thinking…' : 'Ask question'}</button></form>
                {aiError && <div className="mt-4"><ErrorNotice>{aiError}</ErrorNotice></div>}
                {answer && <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 sm:p-5"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-800"><Sparkles className="h-4 w-4" /> {answer.abstained ? 'No supported answer found' : 'Grounded answer'}</div><p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{answer.answer}</p>{answer.citations?.length > 0 && <div className="mt-4 border-t border-cyan-200 pt-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Check the source</p><ul className="mt-2 space-y-2">{answer.citations.map((citation) => <li key={citation.passage_id + citation.quote} className="rounded-xl border border-white bg-white/90 p-3 text-sm leading-6 text-slate-700"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-cyan-800">{citation.passage_id}</span>“{citation.quote}”</li>)}</ul></div>}</div>}
              </div>
            </section>}
          </>}
        </div>
      </div>
    </section>
  );
}
