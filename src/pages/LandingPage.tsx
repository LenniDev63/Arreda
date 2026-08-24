import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Home as HomeIcon, Wallet, ShieldCheck, ArrowRight, TreePine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PropertyWithRelations } from '@/lib/types';
import { PropertyCard } from '@/components/PropertyCard';

export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [featured, setFeatured] = useState<PropertyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`*, photos:property_photos(*), pricing:rental_pricing(*), reviews:reviews(nota)`)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!error && data) setFeatured(data as PropertyWithRelations[]);
      setLoading(false);
    })();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : '/buscar');
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(245,166,35,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15), transparent 50%)"
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 5L45 25L60 5L30 35L0 5L15 25Z' fill='white'/%3E%3C/svg%3E\")",
          backgroundSize: '120px 120px',
        }} />
        <div className="relative container-app py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur mb-6">
              <TreePine className="h-4 w-4 text-orange-300" />
              Acomodações com alma de interior
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Encontre seu próximo<br />
              <span className="text-orange-300">cantinho de descanso</span>
            </h1>
            <p className="mt-5 text-lg text-emerald-50/90 max-w-xl mx-auto">
              Casas, chalés e apartamentos para alugar por diária, semana ou mês.
              Sem complicação, com aprovação direta do proprietário.
            </p>

            {/* SEARCH BAR */}
            <form onSubmit={handleSearch} className="mt-8 mx-auto max-w-xl">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl bg-white p-2 shadow-xl">
                <div className="relative flex-1 flex items-center">
                  <MapPin className="absolute left-4 h-5 w-5 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Para onde você vai? Cidade ou bairro…"
                    className="w-full rounded-xl border-0 bg-transparent pl-12 pr-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <button type="submit" className="btn-primary sm:px-6 py-3">
                  <Search className="h-4 w-4" /> Buscar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-emerald-50/80">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Segurança verificada</span>
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Pagamento facilitado</span>
              <span className="flex items-center gap-1.5"><HomeIcon className="h-4 w-4" /> Localizações selecionadas</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </section>

      {/* FEATURED */}
      <section className="container-app py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900">Acomodações em destaque</h2>
            <p className="mt-1 text-stone-500">As mais recentes e bem avaliadas na plataforma</p>
          </div>
          <Link to="/buscar" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-stone-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-200 rounded w-1/2" />
                  <div className="h-6 bg-stone-200 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="card p-12 text-center">
            <HomeIcon className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-stone-500">Ainda não há imóveis cadastrados. Seja o primeiro a anunciar!</p>
            <Link to="/cadastro" className="btn-primary mt-4">Quero anunciar</Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </section>

      {/* VALUE PROPS */}
      <section className="bg-white border-y border-stone-100">
        <div className="container-app py-14">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Reservas seguras', desc: 'Solicite sua reserva e o proprietário aprova. Nós lhe damos segurança em toda transação.' },
              { icon: Wallet, title: 'Anuncie seu imóvel', desc: 'Cadastre seu imóvel gratuitamente, receba reservas e tenha o repasse caindo direto na sua conta, de forma segura nossas taxas são apenas para garantir você e ao seu cliente facilidades e segurança.' },
              { icon: TreePine, title: 'Refúgios aconchegantes', desc: 'Diária, semanal ou mensal. Escolha o que faz sentido para a sua estadia ou anuncie de acordo com a sua vontade de disponibilizar seu imóvel, seja para lazer, negócios, temporada ou até mesmo fixo.' },
            ].map((v, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="mx-auto md:mx-0 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <v.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900">{v.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA OWNER */}
      <section className="container-app py-16">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-12 md:px-16 md:py-16 text-center text-white shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 90% 20%, rgba(255,255,255,0.4), transparent 40%)"
          }} />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold">Tem um imóvel parado?</h2>
            <p className="mt-3 max-w-xl mx-auto text-orange-50">
              Anuncie grátis no Arreda e comece a receber hóspedes. Você define os preços,
              as regras e o calendário.<br></br> Nós cuidamos de tudo para que o pagamento chegue até você de forma segura.
            </p>
            <Link to="/cadastro" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-orange-600 hover:bg-orange-50 transition shadow-md">
              Quero anunciar meu imóvel <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
