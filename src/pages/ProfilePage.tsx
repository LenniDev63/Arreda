import { useState, useRef } from 'react';
import { User as UserIcon, Phone, Loader2, Check, AlertCircle, CreditCard, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { UserType } from '@/lib/types';

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function ProfilePage() {
  const { profile, refreshProfile, user } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? '');
  const [telefone, setTelefone] = useState(profile?.telefone ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(profile?.cpf_cnpj ?? '');
  const [tipo, setTipo] = useState<UserType>(profile?.tipo ?? 'client');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  async function handleAvatarUpload(file: File) {
    if (!profile) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', profile.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
    } catch (e) {
      setError('Erro no upload da foto: ' + (e as Error).message);
    }
    setUploadingAvatar(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    if (tipo === 'owner' && cpfCnpj.replace(/\D/g, '').length !== 11 && cpfCnpj.replace(/\D/g, '').length !== 14) {
      setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ nome, telefone, tipo, cpf_cnpj: tipo === 'owner' ? cpfCnpj.replace(/\D/g, '') : null })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    await refreshProfile();
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPassError(null);
    if (newPassword.length < 6) {
      setPassError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('As senhas não conferem.');
      return;
    }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPass(false);
    if (error) { setPassError('Erro ao alterar senha: ' + error.message); return; }
    setNewPassword('');
    setConfirmPassword('');
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2500);
  }

  if (!profile) return null;

  return (
    <div className="container-app py-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Meu perfil</h1>
      <p className="text-sm text-stone-500 mb-6">Atualize seus dados pessoais, foto e senha.</p>

      {/* Avatar + identity */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.nome} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-8 w-8" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-stone-200 shadow-sm hover:bg-stone-50 transition"
              aria-label="Alterar foto"
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" /> : <Camera className="h-3.5 w-3.5 text-stone-500" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
          </div>
          <div>
            <p className="font-semibold text-stone-800">{profile.nome || 'Sem nome'}</p>
            <p className="text-sm text-stone-500">{user?.email}</p>
            <span className="mt-1 inline-block badge bg-emerald-50 text-emerald-700 border-emerald-200">
              {profile.tipo === 'owner' ? 'Proprietário' : 'Cliente'}
            </span>
          </div>
        </div>
      </div>

      {/* Personal data form */}
      <form onSubmit={handleSave} className="card p-6 space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" /> Perfil atualizado com sucesso!
          </div>
        )}

        <div>
          <label className="label">Nome completo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" required />
        </div>

        <div>
          <label className="label">E-mail</label>
          <input value={user?.email ?? ''} disabled className="input bg-stone-50 text-stone-500" />
          <p className="mt-1 text-xs text-stone-400">O e-mail não pode ser alterado.</p>
        </div>

        <div>
          <label className="label">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input pl-10"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        {tipo === 'owner' && (
          <div>
            <label className="label">CPF ou CNPJ</label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                value={formatCpfCnpj(cpfCnpj)}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="input pl-10"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
          </div>
        )}

        <div>
          <label className="label">Tipo de conta</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo('client')}
              className={`rounded-xl border-2 p-3 text-left transition ${
                tipo === 'client' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
              }`}
            >
              <p className="font-semibold text-sm text-stone-800">Cliente</p>
              <p className="text-xs text-stone-500">Alugar acomodações</p>
            </button>
            <button
              type="button"
              onClick={() => setTipo('owner')}
              className={`rounded-xl border-2 p-3 text-left transition ${
                tipo === 'owner' ? 'border-orange-500 bg-orange-50' : 'border-stone-200'
              }`}
            >
              <p className="font-semibold text-sm text-stone-800">Proprietário</p>
              <p className="text-xs text-stone-500">Anunciar imóveis</p>
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
        </button>
      </form>

      {/* Password change */}
      <form onSubmit={handlePasswordChange} className="card p-6 space-y-5 mt-6">
        <div>
          <h2 className="font-semibold text-stone-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-stone-500" /> Alterar senha
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Mantenha sua conta segura.</p>
        </div>

        {passError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {passError}
          </div>
        )}
        {passSaved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" /> Senha alterada com sucesso!
          </div>
        )}

        <div>
          <label className="label">Nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="Mínimo 6 caracteres"
            />
            <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input pl-10"
              placeholder="Repita a nova senha"
            />
          </div>
        </div>
        <button type="submit" disabled={savingPass} className="btn-outline w-full py-3">
          {savingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Alterar senha'}
        </button>
      </form>
    </div>
  );
}
