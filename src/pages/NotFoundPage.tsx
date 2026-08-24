import { Link } from 'react-router-dom';
import { Home as HomeIcon, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="container-app py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
        <HomeIcon className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-stone-900">404</h1>
      <p className="mt-2 text-stone-600">Página não encontrada.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex"><ArrowLeft className="h-4 w-4" /> Voltar ao início</Link>
    </div>
  );
}
