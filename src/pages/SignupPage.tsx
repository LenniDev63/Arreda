    import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, ArrowLeft, Home, Search, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import type { UserType } from '@/lib/types';

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<UserType>('client');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  function validateCpfCnpj(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 || digits.length === 14;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (tipo === 'owner' && !validateCpfCnpj(cpfCnpj)) {
      setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para cadastro de proprietário.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, nome, tipo, tipo === 'owner' ? cpfCnpj.replace(/\D/g, '') : undefined);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate(tipo === 'owner' ? '/painel/proprietario' : '/painel/cliente');
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-stone-50 to-emerald-50/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
        <div className="card p-8 shadow-card">
          <div className="mb-6 text-center">
            <Logo variant="logo" className="mx-auto" />
            <h1 className="mt-4 text-2xl font-bold text-stone-900">Crie sua conta</h1>
            <p className="mt-1 text-sm text-stone-500">Escolha como você quer usar o Arreda.</p>
          </div>

          {/* Account type selector */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo('client')}
              className={`rounded-xl border-2 p-4 text-left transition ${
                tipo === 'client' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <Search className={`h-5 w-5 ${tipo === 'client' ? 'text-emerald-600' : 'text-stone-400'}`} />
              <p className="mt-2 font-semibold text-stone-800 text-sm">Cliente</p>
              <p className="text-xs text-stone-500">Quero alugar acomodações</p>
            </button>
            <button
              type="button"
              onClick={() => setTipo('owner')}
              className={`rounded-xl border-2 p-4 text-left transition ${
                tipo === 'owner' ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <Home className={`h-5 w-5 ${tipo === 'owner' ? 'text-orange-500' : 'text-stone-400'}`} />
              <p className="mt-2 font-semibold text-stone-800 text-sm">Proprietário</p>
              <p className="text-xs text-stone-500">Quero anunciar imóveis</p>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="input pl-10"
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="voce@email.com"
                />
              </div>
            </div>

            {tipo === 'owner' && (
              <div>
                <label className="label">CPF ou CNPJ *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                    className="input pl-10"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
                <p className="mt-1 text-xs text-stone-400">Necessário para cadastro de proprietário.</p>
              </div>
            )}

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Criar conta como ${tipo === 'owner' ? 'proprietário' : 'cliente'}`}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-stone-400">
            <div className="flex-1 h-px bg-stone-200" />
            ou
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <button onClick={handleGoogle} className="btn-outline w-full py-3">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Cadastrar com Google
          </button>

          <p className="mt-6 text-center text-sm text-stone-500">
            Já tem conta? <Link to="/login" className="font-semibold text-emerald-700 hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
