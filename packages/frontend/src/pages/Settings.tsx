import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, RefreshCw, Zap, Users, WalletCards, Database, Landmark, PiggyBank, BarChart3, UserRound, type LucideIcon } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PersonForm } from '../components/forms/PersonForm';
import { AccountForm } from '../components/forms/AccountForm';
import { formatCurrency, accountTypeLabels } from '../lib/formatters';
import { Person, Account } from '../types';

type Section = 'persons' | 'accounts' | 'data';

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('persons');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { showToast } = useToast();

  const { data: persons, refetch: refetchPersons } = useApi<Person[]>(() => api.getPersons(), []);
  const { data: accounts, refetch: refetchAccounts } = useApi(() => api.getAccounts(), []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `budgetfoyer-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Export réussi !');
    } catch { showToast('Erreur lors de l\'export', 'error'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importData(data);
      showToast('Import réussi !');
      refetchPersons(); refetchAccounts();
    } catch { showToast('Erreur lors de l\'import', 'error'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    setResetLoading(true);
    try {
      await api.resetData();
      showToast('Données réinitialisées');
      setResetConfirm(false);
      refetchPersons(); refetchAccounts();
    } catch { showToast('Erreur lors de la réinitialisation', 'error'); }
    finally { setResetLoading(false); }
  };

  const tabs: Array<{ id: Section; label: string; icon: LucideIcon }> = [
    { id: 'persons', label: 'Personnes', icon: Users },
    { id: 'accounts', label: 'Comptes', icon: WalletCards },
    { id: 'data', label: 'Données', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${activeSection === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <TabIcon size={15}/> {tab.label}
          </button>
        )})}
      </div>

      {activeSection === 'persons' && <PersonsSection persons={persons || []} onRefetch={refetchPersons} showToast={showToast} />}
      {activeSection === 'accounts' && <AccountsSection accounts={accounts || []} persons={persons || []} onRefetch={refetchAccounts} showToast={showToast} />}
      {activeSection === 'data' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Gestion des données</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleExport} className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors group">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <Download size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-slate-100">Exporter en JSON</p>
                <p className="text-xs text-slate-500">Sauvegarde complète de vos données</p>
              </div>
            </button>

            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors cursor-pointer group">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Upload size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-slate-100">Importer depuis JSON</p>
                <p className="text-xs text-slate-500">Restaurer depuis une sauvegarde</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>

            <button
              onClick={() => { showToast('Chargement des données démo...', 'info'); }}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-slate-100">Données de démo</p>
                <p className="text-xs text-slate-500">Charger des données d'exemple</p>
              </div>
            </button>

            <button onClick={() => setResetConfirm(true)} className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
                <RefreshCw size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-slate-100">Réinitialiser</p>
                <p className="text-xs text-slate-500">Supprimer toutes les données</p>
              </div>
            </button>
          </div>
        </Card>
      )}

      <ConfirmDialog open={resetConfirm} onClose={() => setResetConfirm(false)} onConfirm={handleReset} loading={resetLoading}
        title="Réinitialiser toutes les données" message="Cette action supprimera définitivement toutes vos données. Êtes-vous sûr ?" confirmLabel="Réinitialiser" />
    </div>
  );
}

// ── PERSONS ────────────────────────────────────────────────────────────────

function PersonsSection({ persons, onRefetch, showToast }: { persons: Person[]; onRefetch: () => void; showToast: (m: string, t?: 'success'|'error'|'info') => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);

  const handleSubmit = async (data: object) => {
    try {
      if (editing) { await api.updatePerson(editing.id, data); showToast('Personne mise à jour'); }
      else { await api.createPerson(data); showToast('Personne ajoutée'); }
      setModalOpen(false); onRefetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.deletePerson(deleting.id); showToast('Personne supprimée'); setDeleting(null); onRefetch(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Personnes du foyer</h2>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true); }}>Ajouter</Button>
      </div>
      {!persons.length ? <p className="text-sm text-slate-400">Aucune personne.</p> : (
        <div className="space-y-2">
          {persons.map(p => (
            <div key={p.id} className="settings-register-row">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: `${p.color}20`, border: `2px solid ${p.color}` }}><UserRound size={17}/></div>
                <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => { setEditing(p); setModalOpen(true); }} />
                <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={() => setDeleting(p)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la personne' : 'Ajouter une personne'} size="sm">
        <PersonForm initial={editing || undefined} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Supprimer" message={`Supprimer "${deleting?.name}" ?`} />
    </Card>
  );
}

// ── ACCOUNTS ───────────────────────────────────────────────────────────────

function AccountsSection({ accounts, persons, onRefetch, showToast }: { accounts: Account[]; persons: Person[]; onRefetch: () => void; showToast: (m: string, t?: 'success'|'error'|'info') => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  const handleSubmit = async (data: object) => {
    try {
      if (editing) { await api.updateAccount(editing.id, data); showToast('Compte mis à jour'); }
      else { await api.createAccount(data); showToast('Compte ajouté'); }
      setModalOpen(false); onRefetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.deleteAccount(deleting.id); showToast('Compte supprimé'); setDeleting(null); onRefetch(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Comptes bancaires</h2>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true); }}>Ajouter</Button>
      </div>
      {!accounts.length ? <p className="text-sm text-slate-400">Aucun compte.</p> : (
        <div className="space-y-2">
          {accounts.map(a => {
            const person = persons.find(p => p.id === a.person_id);
            const AccountIcon = a.type === 'checking' ? Landmark : a.type === 'savings' ? PiggyBank : BarChart3;
            return (
              <div key={a.id} className="settings-register-row">
                <div className="flex items-center gap-3">
                  <span className="account-icon"><AccountIcon size={19}/></span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{a.name}</p>
                    <p className="text-xs text-slate-500">{accountTypeLabels[a.type]} {person ? `• ${person.name}` : '• Commun'} • Solde initial : {formatCurrency(a.initial_balance)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => { setEditing(a); setModalOpen(true); }} />
                  <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={() => setDeleting(a)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le compte' : 'Ajouter un compte'}>
        <AccountForm initial={editing || undefined} persons={persons} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Supprimer" message={`Supprimer "${deleting?.name}" ?`} />
    </Card>
  );
}
