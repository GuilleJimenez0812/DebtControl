import React, { useState } from 'react';
import type { Person } from '../types';
import type { UserWithPersons } from '../services/api';
import { X, UserPlus, Users, CheckSquare, Square, Save } from 'lucide-react';

interface AdminUserModalProps {
  isOpen: boolean;
  usersWithPersons: UserWithPersons[];
  allPersons: Person[];
  onClose: () => void;
  onCreateUser: (payload: { email: string; password: string; full_name: string; role: string }) => Promise<void>;
  onAssignPersons: (userId: string, personIds: string[]) => Promise<void>;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen,
  usersWithPersons,
  allPersons,
  onClose,
  onCreateUser,
  onAssignPersons,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedUser, setSelectedUser] = useState<UserWithPersons | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<string>('user');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectUserToAssign = (uwp: UserWithPersons) => {
    setSelectedUser(uwp);
    setSelectedPersonIds(uwp.assigned_person_ids || []);
  };

  const handleTogglePerson = (personId: string) => {
    if (selectedPersonIds.includes(personId)) {
      setSelectedPersonIds(selectedPersonIds.filter((id) => id !== personId));
    } else {
      setSelectedPersonIds([...selectedPersonIds, personId]);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await onAssignPersons(selectedUser.user.id, selectedPersonIds);
      setSelectedUser(null);
    } catch {
      setError('Failed to update person assignments.');
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create user account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Admin User & Permission Management</h3>
            <p className="text-xs text-slate-400">Create user accounts and assign person debt visibility</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manage User Permissions
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create New User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            {!selectedUser ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Users</h4>
                <div className="divide-y divide-slate-800">
                  {usersWithPersons.map((uwp) => (
                    <div key={uwp.user.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center space-x-2">
                          <span>{uwp.user.full_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                              uwp.user.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {uwp.user.role}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400">{uwp.user.email}</p>
                        <p className="text-[11px] text-indigo-300 mt-1">
                          Assigned Persons:{' '}
                          {uwp.user.role === 'admin'
                            ? 'All Persons (Admin)'
                            : uwp.assigned_persons.length > 0
                            ? uwp.assigned_persons.map((p) => p.name).join(', ')
                            : 'None (No person access)'}
                        </p>
                      </div>

                      {uwp.user.role !== 'admin' && (
                        <button
                          onClick={() => handleSelectUserToAssign(uwp)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 transition"
                        >
                          Edit Access
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Assign Persons to {selectedUser.user.full_name}</h4>
                    <p className="text-xs text-slate-400">{selectedUser.user.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to List
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-semibold mb-2">Select Persons this user can view:</p>
                  {allPersons.map((person) => {
                    const isChecked = selectedPersonIds.includes(person.id);
                    return (
                      <div
                        key={person.id}
                        onClick={() => handleTogglePerson(person.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-sm font-semibold">{person.name}</span>
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignments}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save Permissions'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <form onSubmit={handleCreateUserSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="User Full Name"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-semibold"
              >
                <option value="user">Normal User (Access limited to assigned persons)</option>
                <option value="admin">Administrator (Full global access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
