import React, { useState } from 'react';
import type { Person } from '../types';
import type { UserWithPersons } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { UserPlus, Users, CheckSquare, Square, Save } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { useToast } from './ui/Toast';

interface AdminUserModalProps {
  isOpen: boolean;
  usersWithPersons: UserWithPersons[];
  allPersons: Person[];
  language: Language;
  onClose: () => void;
  onCreateUser: (payload: { email: string; password: string; full_name: string; role: string }) => Promise<void>;
  onAssignPersons: (userId: string, personIds: string[]) => Promise<void>;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen,
  usersWithPersons,
  allPersons,
  language,
  onClose,
  onCreateUser,
  onAssignPersons,
}) => {
  const t = translations[language];
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedUser, setSelectedUser] = useState<UserWithPersons | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<string>('user');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSelectUserToAssign = (uwp: UserWithPersons) => {
    setSelectedUser(uwp);
    setSelectedPersonIds(uwp.assigned_person_ids || []);
  };

  const handleTogglePerson = (personId: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await onAssignPersons(selectedUser.user.id, selectedPersonIds);
      setSelectedUser(null);
      toast('success', t.savedPermissions);
    } catch {
      toast('error', t.failedAssignments);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onCreateUser({ email, password, full_name: fullName, role });
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('user');
      setActiveTab('list');
      toast('success', t.userCreated);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t.failedCreateUser);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <span>{t.adminTitle}</span>
        </span>
      }
      subtitle={t.adminDesc}
    >
      {/* Tab Switcher */}
      <div className="mb-5 flex gap-1 rounded-[10px] border border-line bg-black/[0.03] p-1 dark:border-line-dark dark:bg-white/[0.04]">
        <button
          onClick={() => {
            setActiveTab('list');
            setSelectedUser(null);
          }}
          className={`flex-1 rounded-[8px] px-4 py-2 text-xs font-bold transition ${
            activeTab === 'list' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark'
          }`}
        >
          {t.manageUserPermissions}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 rounded-[8px] px-4 py-2 text-xs font-bold transition ${
            activeTab === 'create' ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark'
          }`}
        >
          {t.createNewUser}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {activeTab === 'list' && (
        <div>
          {!selectedUser ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">{t.systemUsers}</h4>
              <div className="divide-y divide-line dark:divide-line-dark">
                {usersWithPersons.length === 0 && (
                  <p className="py-8 text-center text-sm text-ink-muted dark:text-ink-muted-dark">{t.noResultsFound}</p>
                )}
                {usersWithPersons.map((uwp) => (
                  <div key={uwp.user.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
                        <span>{uwp.user.full_name}</span>
                        <Badge tone={uwp.user.role === 'admin' ? 'accent' : 'neutral'} className="uppercase">
                          {uwp.user.role}
                        </Badge>
                      </p>
                      <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{uwp.user.email}</p>
                      <p className="mt-1 text-[11px] text-ink-secondary dark:text-ink-secondary-dark">
                        {t.assignedPersons}{' '}
                        {uwp.user.role === 'admin'
                          ? t.allPersonsAdmin
                          : uwp.assigned_persons.length > 0
                          ? uwp.assigned_persons.map((p) => p.name).join(', ')
                          : t.noneNoAccess}
                      </p>
                    </div>

                    {uwp.user.role !== 'admin' && (
                      <Button size="sm" variant="secondary" onClick={() => handleSelectUserToAssign(uwp)}>
                        {t.editAccess}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-line bg-panel p-4 dark:border-line-dark dark:bg-panel">
              <div className="flex items-center justify-between border-b border-line pb-3 dark:border-line-dark">
                <div>
                  <h4 className="text-sm font-bold text-ink dark:text-ink-dark">{t.assignPersonsTo} {selectedUser.user.full_name}</h4>
                  <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{selectedUser.user.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-xs font-semibold text-accent hover:text-accent-hover dark:hover:text-accent-hover-dark">
                  {t.backToList}
                </button>
              </div>

              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.selectPersonsView}</p>
                {allPersons.map((person) => {
                  const isChecked = selectedPersonIds.includes(person.id);
                  return (
                    <div
                      key={person.id}
                      onClick={() => handleTogglePerson(person.id)}
                      className={`flex items-center justify-between rounded-[10px] border p-3 transition cursor-pointer ${
                        isChecked
                          ? 'border-accent/50 bg-accent/10 text-ink dark:text-ink-dark'
                          : 'border-line text-ink-secondary hover:border-accent/30 dark:border-line-dark dark:text-ink-secondary-dark'
                      }`}
                    >
                      <span className="text-sm font-semibold">{person.name}</span>
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-accent" />
                      ) : (
                        <Square className="h-5 w-5 text-ink-muted dark:text-ink-muted-dark" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-3 dark:border-line-dark">
                <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                  {t.cancel}
                </Button>
                <Button size="sm" onClick={handleSaveAssignments} isLoading={loading} disabled={loading}>
                  <Save className="h-3.5 w-3.5" />
                  <span>{loading ? t.saving : t.savePermissions}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.fullName}</label>
            <Input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="User Full Name" className="w-full" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.emailAddress}</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="w-full" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.password}</label>
            <Input type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="w-full" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.userRole}</label>
            <Select
              value={role}
              onValueChange={setRole}
              options={[
                { value: 'user', label: t.normalUserRole },
                { value: 'admin', label: t.adminRole },
              ]}
              className="w-full"
            />
          </div>

          <Button type="submit" isLoading={loading} disabled={loading} className="w-full">
            <UserPlus className="h-4 w-4" />
            <span>{loading ? t.creatingAccount : t.createAccount}</span>
          </Button>
        </form>
      )}
    </Modal>
  );
};