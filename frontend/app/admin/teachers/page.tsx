'use client';
import { useEffect, useState } from 'react';
import {
  getTeachers, createTeacher, updateTeacher, disableTeacher, enableTeacher,
  TeacherItem, CreateTeacherInput, UpdateTeacherInput,
} from '@/lib/admin-portal-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

const ACCENT = '#4F9DFF';

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Teacher Modal (Create / Edit) ───────────────────────────────────────────

function TeacherModal({ editing, onClose, onSaved }: {
  editing: TeacherItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.upn ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) {
        const data: UpdateTeacherInput = { name, phone };
        if (password) data.password = password;
        await updateTeacher(editing.id, data);
        onSaved('Changes saved.');
      } else {
        const data: CreateTeacherInput = { email, name, phone, password };
        await createTeacher(data);
        onSaved('Teacher account created.');
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-8 pt-7 pb-5 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-xl font-black text-textPrimary">
              {editing ? 'Edit Teacher' : 'Create Teacher'}
            </DialogTitle>
            <p className="text-xs text-textSecondary mt-1">
              {editing ? 'Update teacher details.' : 'Add a new teacher account.'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:bg-gray-100 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-8 py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teacher-name">Name</Label>
            <Input
              id="teacher-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="border-border"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teacher-email">Email</Label>
            <Input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              required
              disabled={!!editing}
              className="border-border disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teacher-phone">Phone</Label>
            <Input
              id="teacher-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              required
              className="border-border"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teacher-password">
              {editing ? 'New Password' : 'Password'}
            </Label>
            <Input
              id="teacher-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? 'Leave blank to keep current' : 'Password'}
              required={!editing}
              className="border-border"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Keep teacher
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 gap-2"
              style={{ background: ACCENT }}
            >
              {loading && <Spinner />}
              {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Disable / Enable Confirm Dialog ─────────────────────────────────────────

function ConfirmDialog({ target, onClose, onConfirmed }: {
  target: TeacherItem;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDisabling = !target.disabled;

  async function handleConfirm() {
    setError('');
    setLoading(true);
    try {
      if (isDisabling) {
        await disableTeacher(target.id);
      } else {
        await enableTeacher(target.id);
      }
      onConfirmed();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="px-8 pt-7 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-black text-textPrimary">
            {isDisabling ? 'Disable teacher?' : 'Enable teacher?'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 py-5">
          <p className="text-sm text-textSecondary">
            {isDisabling
              ? `Disable teacher? ${target.name ?? target.upn} will no longer be able to log in until re-enabled.`
              : `Enable teacher? ${target.name ?? target.upn} will be able to log in again.`}
          </p>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </div>

        <DialogFooter className="px-8 pb-7 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            Keep teacher
          </Button>
          {isDisabling ? (
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="flex-1 rounded-xl text-white disabled:opacity-60 gap-2 bg-destructive hover:bg-destructive/90"
            >
              {loading && <Spinner />}
              {loading ? 'Disabling...' : 'Disable account'}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="flex-1 rounded-xl text-white disabled:opacity-60 gap-2"
              style={{ background: ACCENT }}
            >
              {loading && <Spinner />}
              {loading ? 'Enabling...' : 'Enable account'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Teachers Page ────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TeacherItem | null>(null);
  const [toast, setToast] = useState('');

  async function loadTeachers() {
    setLoading(true);
    setError('');
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTeachers(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="animate-fade-in">
      {/* Modals */}
      {(creating || editing) && (
        <TeacherModal
          editing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(msg) => { loadTeachers(); showToast(msg); }}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          target={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirmed={() => { loadTeachers(); showToast('Changes saved.'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-textSecondary">
          {loading ? 'Loading...' : `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`}
        </p>
        <Button
          onClick={() => setCreating(true)}
          className="text-white font-bold rounded-xl px-5 h-auto py-2.5 hover:opacity-90"
          style={{ background: ACCENT }}
        >
          Create Teacher
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-bold text-textPrimary mb-2">No teachers yet</h3>
          <p className="text-sm text-textSecondary">
            Create the first teacher account to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wide">Name</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wide">Email</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wide">Phone</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wide">Status</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow
                  key={t.id}
                  className={`hover:bg-slate-50 ${t.disabled ? 'text-slate-400' : ''}`}
                >
                  <TableCell className="px-5 py-3 font-medium">
                    {t.name ?? <span className="text-textSecondary italic">No name</span>}
                  </TableCell>
                  <TableCell className="px-5 py-3">{t.upn}</TableCell>
                  <TableCell className="px-5 py-3">
                    {t.phone ?? <span className="text-textSecondary italic">—</span>}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    {t.disabled
                      ? <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>
                      : <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(t)}
                        className="h-auto py-1.5 px-3 text-xs font-semibold rounded-lg hover:bg-slate-100"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmTarget(t)}
                        className={`h-auto py-1.5 px-3 text-xs font-semibold rounded-lg ${
                          t.disabled
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                      >
                        {t.disabled ? 'Enable' : 'Disable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
