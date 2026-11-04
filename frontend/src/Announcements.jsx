import React, { useEffect, useState } from 'react';
import { AlertCircle, Bell, Check, FileText, Image, Link2, Loader2, Megaphone, Plus, Send } from 'lucide-react';
import { announcementApi, teacherApi } from './api';

const card = 'rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]';

function ErrorNotice({ children }) {
  return children ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{children}</div> : null;
}

function fileNameFor(item, kind) {
  return kind === 'file' ? (item.attachment_filename || item.pdf_filename) : item.poster_filename;
}

export default function Announcements({ mode, showToast }) {
  const isTeacher = mode === 'teacher';
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isAlert, setIsAlert] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [poster, setPoster] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [posterUrls, setPosterUrls] = useState({});

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = isTeacher ? await announcementApi.listMine() : await announcementApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    if (isTeacher) {
      teacherApi.getClasses()
        .then((rows) => setClasses(Array.isArray(rows) ? rows : []))
        .catch((err) => setError(err.message || 'Could not load your assigned classes.'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const generated = [];
    setPosterUrls({});
    items.filter((item) => item.has_poster).forEach((item) => {
      announcementApi.getAttachmentBlob(item.id, 'poster')
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          generated.push(url);
          if (active) setPosterUrls((current) => ({ ...current, [item.id]: url }));
          else URL.revokeObjectURL(url);
        })
        .catch(() => {});
    });
    return () => {
      active = false;
      generated.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [items]);

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

  const handleAttachment = (file) => {
    setAttachmentError('');
    const allowed = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md|csv|rtf)$/i;
    if (file && (!allowed.test(file.name) || file.size > 20 * 1024 * 1024)) {
      setAttachmentError('Choose a supported document smaller than 20 MB.');
      setAttachment(null);
      return;
    }
    setAttachment(file || null);
  };

  const handlePoster = (file) => {
    setAttachmentError('');
    if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024)) {
      setAttachmentError('Choose a PNG, JPEG, or WebP poster smaller than 6 MB.');
      setPoster(null);
      return;
    }
    setPoster(file || null);
  };

  const publish = async (event) => {
    event.preventDefault();
    setError('');
    setAttachmentError('');
    if (!classId) {
      setError('Choose the class that should receive this announcement.');
      return;
    }
    const body = new FormData();
    body.append('title', title.trim());
    body.append('message', message.trim());
    body.append('class_id', classId);
    if (subjectId) body.append('subject_id', subjectId);
    body.append('priority', priority);
    body.append('is_alert', String(isAlert));
    if (linkUrl.trim()) body.append('link_url', linkUrl.trim());
    if (linkLabel.trim()) body.append('link_label', linkLabel.trim());
    if (eventDate) body.append('event_date', eventDate);
    if (attachment) body.append('attachment', attachment);
    if (poster) body.append('poster', poster);

    setSaving(true);
    try {
      await announcementApi.create(body);
      setTitle('');
      setMessage('');
      setPriority('normal');
      setIsAlert(false);
      setLinkLabel('');
      setLinkUrl('');
      setEventDate('');
      setAttachment(null);
      setPoster(null);
      setComposerOpen(false);
      showToast?.(isAlert ? 'Urgent class alert sent.' : 'Announcement sent to the class.', 'success');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Could not publish this announcement.');
    } finally {
      setSaving(false);
    }
  };

  const download = async (item, kind) => {
    setAttachmentError('');
    try {
      const blob = await announcementApi.getAttachmentBlob(item.id, kind);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileNameFor(item, kind) || (kind === 'pdf' ? 'course-announcement.pdf' : 'announcement-poster');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAttachmentError(err.message || 'Could not download the attachment.');
    }
  };

  const urgentCount = items.filter((item) => item.is_alert || item.priority === 'urgent').length;
  const className = (id) => classes.find((item) => String(item.id) === String(id))?.name || items.find((item) => String(item.class_id) === String(id))?.class_name || 'Course announcement';
  const announcementGroups = (() => {
    const groups = new Map();
    if (isTeacher) classes.forEach((batch) => groups.set(String(batch.id), { id: String(batch.id), name: batch.name, items: [] }));
    items.forEach((item) => {
      const id = String(item.class_id);
      if (!groups.has(id)) groups.set(id, { id, name: item.class_name || className(id), items: [] });
      groups.get(id).items.push(item);
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();
  const visibleAnnouncementGroups = selectedBatch === 'all'
    ? announcementGroups
    : announcementGroups.filter((group) => group.id === selectedBatch);

  return (
    <section className="mx-auto max-w-7xl space-y-6" aria-labelledby="announcements-heading">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 px-6 py-7 text-white shadow-xl shadow-indigo-950/10 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100"><Megaphone className="h-3.5 w-3.5" /> CLASS COMMUNICATIONS</span>
            <h2 id="announcements-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{isTeacher ? 'One clear place to reach your class.' : 'Announcements for your class.'}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{isTeacher ? 'Publish a notice, attach the handout or poster, and flag urgent updates for your students.' : 'Read class notices, download handouts, and follow links shared by your teachers.'}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><Bell className="h-5 w-5" /></div><div><p className="text-xl font-bold leading-none">{items.length}</p><p className="mt-1 text-xs text-slate-400">{isTeacher ? 'class announcements' : (urgentCount ? urgentCount + ' priority alert' + (urgentCount === 1 ? '' : 's') : 'class announcements')}</p></div></div>
        </div>
      </header>

      {error && <ErrorNotice>{error}</ErrorNotice>}
      {attachmentError && <ErrorNotice>{attachmentError}</ErrorNotice>}

      {isTeacher && <div className="flex justify-end"><button type="button" onClick={() => setComposerOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"><Plus className="h-4 w-4" /> New announcement</button></div>}

      {isTeacher && composerOpen && (
        <form onSubmit={publish} className={card + ' space-y-6 p-5 sm:p-7'}>
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Compose</p><h3 className="mt-1 text-xl font-bold text-slate-900">New class announcement</h3><p className="mt-1 text-sm text-slate-500">Select an assigned class. The server checks the audience before publishing.</p></div>
          <section className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Audience class
              <select required value={classId} onChange={(event) => chooseClass(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Choose an assigned class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.year} · Section {item.section}</option>)}</select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Subject (optional)
              <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!classId || !subjects.length} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal disabled:bg-slate-100"><option value="">All subjects in this class</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ' · ' + item.code : ''}</option>)}</select>
            </label>
          </section>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Announcement title
              <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Lab moved to Room 204" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">Message
            <textarea required maxLength={10000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the details students need to know…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal leading-relaxed outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>

          <label className="block max-w-sm space-y-1.5 text-sm font-semibold text-slate-700">Test or event date (optional)
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal" />
            <span className="block text-xs font-normal text-slate-500">This date appears as a reminder on your dashboard and in the class announcement.</span>
          </label>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-800"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-rose-600" /> Attach a file from this device</span><span className="mt-1 block text-xs font-normal text-slate-500">PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV, or RTF · up to 20 MB</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.rtf,application/pdf,text/plain,text/csv" onChange={(event) => handleAttachment(event.target.files?.[0])} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700" />{attachment && <span className="mt-2 block truncate text-xs text-emerald-700">{attachment.name}</span>}</label>
            <div className="rounded-2xl border border-slate-200 p-4"><label className="block text-sm font-semibold text-slate-800"><span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-600" /> Helpful link</span><input maxLength={120} value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Link label (optional)" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /><input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div>
            <label className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-800"><span className="flex items-center gap-2"><Image className="h-4 w-4 text-violet-600" /> Poster image</span><span className="mt-1 block text-xs font-normal text-slate-500">PNG, JPEG, or WebP · up to 6 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handlePoster(event.target.files?.[0])} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700" />{poster && <span className="mt-2 block truncate text-xs text-emerald-700">{poster.name}</span>}</label>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={isAlert} onChange={(event) => setIsAlert(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-600" /><span><span className="block text-sm font-bold text-amber-950">Send as an urgent class alert</span><span className="mt-0.5 block text-xs leading-5 text-amber-800">It will be highlighted at the top of the students’ in-app announcements feed.</span></span></label>
            <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setComposerOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white">Cancel</button><button type="submit" disabled={saving || !title.trim() || !message.trim() || !classId} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{saving ? 'Publishing…' : 'Publish to class'}</button></div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{isTeacher ? 'Delivery log' : 'Class feed'}</p><h3 className="mt-1 text-xl font-bold text-slate-900">{isTeacher ? 'Announcements by class' : 'Your class announcement stream'}</h3></div><div className="flex gap-2">{isTeacher && <label className="sr-only" htmlFor="announcement-batch-filter">Filter announcements by class</label>}{isTeacher && <select id="announcement-batch-filter" value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><option value="all">All assigned classes</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select>}<button type="button" onClick={loadItems} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Refresh</button></div></div>
        {loading ? <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-48 animate-pulse rounded-3xl bg-slate-100" />)}</div>
          : announcementGroups.length === 0 ? <div className={card + ' p-10 text-center'}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Megaphone className="h-5 w-5" /></div><h4 className="mt-3 font-bold text-slate-900">{isTeacher ? 'No assigned classes yet' : 'No announcements for your class yet'}</h4><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{isTeacher ? 'Your assigned classes will appear here when the college admin adds them.' : 'Your teachers’ class announcements will appear here.'}</p></div>
            : <div className={isTeacher ? 'space-y-6' : 'grid gap-4 xl:grid-cols-2'}>{visibleAnnouncementGroups.map((group) => <section key={group.id} className={isTeacher ? 'space-y-3' : 'contents'}>{isTeacher && <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><div><h4 className="font-bold text-slate-900">{group.name}</h4><p className="mt-0.5 text-xs text-slate-500">{group.items.length} announcement{group.items.length === 1 ? '' : 's'}</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">Assigned class</span></header>}{group.items.length === 0 ? (isTeacher ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">No notices sent to this class yet.</div> : null) : <div className={isTeacher ? 'grid gap-4 xl:grid-cols-2' : 'contents'}>{group.items.map((item) => <article key={item.id} className={card + ' overflow-hidden ' + ((item.is_alert || item.priority === 'urgent') ? 'border-amber-300 ring-1 ring-amber-100' : '')}>
              {item.has_poster && posterUrls[item.id] && <img src={posterUrls[item.id]} alt={item.title + ' poster'} className="max-h-72 w-full bg-slate-100 object-contain" />}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">{className(item.class_id)}</span>{item.priority !== 'normal' && <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ' + (item.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')}>{item.priority}</span>}{item.is_alert && <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"><Bell className="h-3 w-3" /> Alert</span>}</div>
                <h4 className="mt-3 text-lg font-bold text-slate-950">{item.title}</h4>{item.event_date && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700"><Bell className="h-3.5 w-3.5" /> {new Date(item.event_date + 'T00:00:00').toLocaleDateString()} · Test/event reminder</p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">{(item.has_attachment || item.has_pdf) && <button type="button" onClick={() => download(item, item.attachment_filename ? 'file' : (item.file_name ? 'file' : (item.has_pdf ? 'pdf' : 'file')))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50"><FileText className="h-4 w-4 text-rose-600" /> Download {item.attachment_filename || item.pdf_filename || 'attachment'}</button>}{item.link_url && <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"><Link2 className="h-4 w-4" />{item.link_label || 'Open link'}</a>}</div>
                <p className="mt-4 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            </article>)}</div>}</section>)}</div>}
      </div>
    </section>
  );
}
