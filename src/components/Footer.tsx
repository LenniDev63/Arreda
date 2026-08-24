import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Home, Shield, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="container-app py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo variant="logo" className="h-10 w-auto" />
            <p className="mt-3 max-w-sm text-sm text-stone-600">
              A plataforma de alugueis mais acolhedora de Minas Gerais. Encontre refúgios
              aconchegantes ou anuncie seu imóvel de forma simples e segura.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-800 mb-3">Navegação</h4>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><Link to="/" className="hover:text-emerald-700">Início</Link></li>
              <li><Link to="/buscar" className="hover:text-emerald-700">Explorar imóveis</Link></li>
              <li><Link to="/anunciar" className="hover:text-emerald-700">Anunciar seu imóvel</Link></li>
              <li><Link to="/cadastro" className="hover:text-emerald-700">Criar conta</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-800 mb-3">Confiança</h4>
            <ul className="space-y-2 text-sm text-stone-600">
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" /> Reservas com aprovação do proprietário</li>
              <li className="flex items-center gap-2"><Home className="h-4 w-4 text-emerald-600" /> Imóveis verificados</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-600" /> contato@arreda.com.br</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row justify-between gap-2 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Arreda. Feita pra te acolher.</p>
          <p>Solicite sua reserva e nós intermediamos com total segurança entre você e o proprietário.</p>
        </div>
      </div>
    </footer>
  );
}
