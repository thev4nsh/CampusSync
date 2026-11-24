import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { registrationApi, assetUrl } from '../api/api';

const refKey = (token) => `campussync_registration_${token}`;

const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  registration_number: '',
  roll_number: '',
  department: '',
  batch_key: '',
  section: '',
};

/** Public admission form reached through a link the admin generated. */
export default function RegistrationPage() {
  const { token } = useParams();

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async (reference) => {
    if (!reference) return;
    setLoadingStatus(true);
    try {
      const data = await registrationApi.getStatus(token, reference);
      setStatus(data);
      localStorage.setItem(refKey(token), reference);
    } catch (err) {
      setStatus(null);
      // A reference saved from an earlier session may no longer exist.
      if (err?.status === 404) localStorage.removeItem(refKey(token));
      setFormError(err?.message || 'Could not find that application.');
    } finally {
      setLoadingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await registrationApi.getForm(token);
        if (!active) return;
        setInfo(data);
        const saved = localStorage.getItem(refKey(token));
        if (saved) loadStatus(saved);
      } catch (err) {
        if (active) setInfoError(err?.message || 'This registration link is not valid.');
      } finally {
        if (active) setLoadingInfo(false);
      }
    })();
    return () => { active = false; };
  }, [token, loadStatus]);

  // Departments, batches, classes and sections are exactly the ones created in the admin portal.
  const departments = info?.departments || [];
  const admissionOptions = [
    ...(info?.batches || [])
      .filter((batch) => batch.department_name === form.department)
      .map((batch) => ({ key: `batch:${batch.id}`, label: batch.name, sections: batch.sections || [] })),
    ...(info?.standalone_classes || [])
      .filter((item) => item.department_name === form.department)
      .map((item) => ({
        key: `class:${item.id}`,
        label: `${item.name} (single class)`,
        sections: item.section ? [item.section] : [],
      })),
  ];
  const selectedOption = admissionOptions.find((option) => option.key === form.batch_key);
  const sections = selectedOption?.sections || [];

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.department) {
      setFormError('Choose your department.');
      return;
    }
    if (!form.batch_key) {
      setFormError('Choose your admission batch.');
      return;
    }
    if (sections.length > 0 && !form.section) {
      setFormError('Choose your section.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('The two passwords do not match.');
      return;
    }
    if (form.password.length < 12) {
      setFormError('Password must be at least 12 characters.');
      return;
    }

    const [selectionKind, selectionId] = form.batch_key.split(':');

    setSubmitting(true);
    try {
      const created = await registrationApi.submit(token, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        registration_number: form.registration_number.trim(),
        roll_number: form.roll_number.trim(),
        department: form.department,
        batch_id: selectionKind === 'batch' ? Number(selectionId) : null,
        class_id: selectionKind === 'class' ? Number(selectionId) : null,
        section: form.section || '',
      });
      localStorage.setItem(refKey(token), created.reference);
      setStatus(created);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err?.message || 'Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(status.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const logo = info?.logo_url ? assetUrl(info.logo_url) : '/campussync-logo.svg';
  const collegeName = info?.institution_name || 'CampusSync';

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-5">
        <div className="text-center">
          <img
            src={logo}
            alt={`${collegeName} logo`}
            className={`inline-flex w-14 h-14 rounded-2xl shadow-xl shadow-blue-600/30 mb-3 ring-4 ring-blue-500/20 object-contain ${info?.logo_url ? 'bg-white p-1.5' : ''}`}
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{collegeName}</h1>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mt-1">
            Student Registration {info?.link_label ? `• ${info.link_label}` : ''}
          </p>
        </div>

        {loadingInfo ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            Loading the registration form...
          </div>
        ) : infoError ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="font-bold text-slate-900">Link unavailable</p>
            <p className="text-sm text-slate-500 mt-1">{infoError}</p>
            <p className="text-xs text-slate-400 mt-3">Ask the college office for a fresh registration link.</p>
          </div>
        ) : !info?.is_active ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-slate-900">Registration is closed</p>
            <p className="text-sm text-slate-500 mt-1">This link is no longer accepting applications. Contact the college office.</p>
          </div>
        ) : status ? (
          /* ---------------- Status view ---------------- */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3">
              {status.status === 'approved' && <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />}
              {status.status === 'rejected' && <XCircle className="w-7 h-7 text-rose-600 shrink-0" />}
              {status.status === 'pending' && <Clock className="w-7 h-7 text-amber-500 shrink-0" />}
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {status.status === 'approved' && 'Application approved'}
                  {status.status === 'rejected' && 'Application rejected'}
                  {status.status === 'pending' && 'Application submitted — waiting for review'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Hello {status.name}. Your reference number is below; keep it for the office.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</span>
              <code className="text-sm font-mono text-slate-800 flex-1 break-all">{status.reference}</code>
              <button
                type="button"
                onClick={copyReference}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {status.status === 'approved' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                Your login is ready. Sign in with your <strong>registration number</strong> or college email and the
                password you chose.
              </div>
            )}

            {status.status === 'rejected' && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700 mb-1">Reason from the office</p>
                <p className="text-sm text-rose-800 whitespace-pre-line">{status.decision_reason || 'No reason was recorded.'}</p>
                <p className="text-xs text-rose-600 mt-2">Visit the college office with this reference number to resolve it.</p>
              </div>
            )}

            {status.status === 'pending' && (
              <p className="text-sm text-slate-500">
                The college office reviews applications and will approve or reject yours. Re-open this same link to see
                the decision.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => loadStatus(status.reference)}
                disabled={loadingStatus}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-70"
              >
                {loadingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Refresh status
              </button>
              <Link to="/login" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Go to sign in</Link>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">Checking a different application?</p>
              <div className="flex gap-2">
                <input
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  placeholder="Paste a reference number"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => loadStatus(referenceInput.trim())}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ---------------- Form ---------------- */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fill in your details</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your registration number becomes your student ID, so you can sign in with it or with your college email.
                The office reviews every application.
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="As printed on your documents"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registration number *</label>
                <input
                  required
                  value={form.registration_number}
                  onChange={(e) => update('registration_number', e.target.value.toUpperCase())}
                  placeholder="e.g. CSE24015"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll number *</label>
                <input
                  required
                  value={form.roll_number}
                  onChange={(e) => update('roll_number', e.target.value.toUpperCase())}
                  placeholder="e.g. 24CSE015"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value, batch_key: '', section: '' }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Choose your department</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch *</label>
                <select
                  required
                  value={form.batch_key}
                  disabled={!form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, batch_key: e.target.value, section: '' }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">{form.department ? 'Choose your batch' : 'Choose your department first'}</option>
                  {admissionOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
                {form.department && admissionOptions.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No batches have been added for this department yet. Contact the college office.
                  </p>
                )}
              </div>

              {/* Only shown when the admin created sections for this batch. */}
              {sections.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
                  <select
                    required
                    value={form.section}
                    onChange={(e) => update('section', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Choose your section</option>
                    {sections.map((section) => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="At least 12 characters"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    required
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="Type the same password again"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-700">Back to sign in</Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 disabled:opacity-70"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit application'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-500">
          Your password is stored encrypted. The college office only sees your submitted details.
        </p>
      </div>
    </div>
  );
}
