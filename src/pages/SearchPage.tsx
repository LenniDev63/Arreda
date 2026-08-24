import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Home as HomeIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PropertyWithRelations, RentalType } from '@/lib/types';
import { PropertyCard } from '@/components/PropertyCard';
import { EmptyState } from '@/components/EmptyState';
import { AMENITIES, RENTAL_TYPES } from '@/lib/constants';
import { AmenityIcon } from '@/components/AmenityIcon';

const PRICE_RANGES = [
  { id: '0-150', label: 'Até R$ 150', min: 0, max: 150 },
  { id: '150-300', label: 'R$ 150 – 300', min: 150, max: 300 },
  { id: '300-600', label: 'R$ 300 – 600', min: 300, max: 600 },
  { id: '600-9999', label: 'Acima de R$ 600', min: 600, max: 9999 },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [all, setAll] = useState<PropertyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get('q') ?? '';
  const tipo = (params.get('tipo') ?? '') as RentalType | '';
  const priceRange = params.get('preco') ?? '';
  const guests = params.get('hospedes') ?? '';
  const selectedAmenities = params.getAll('comodidade');

  function updateParam(key: string, value: string, opts?: { multi?: boolean; remove?: boolean }) {
    const next = new URLSearchParams(params);
    if (opts?.multi) {
      const existing = next.getAll(key);
      if (opts.remove) {
        next.delete(key);
        existing.filter((v) => v !== value).forEach((v) => next.append(key, v));
      } else if (!existing.includes(value)) {
        next.append(key, value);
      }
    } else {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`*, photos:property_photos(*), amenities:property_amenities(*), pricing:rental_pricing(*), reviews:reviews(nota)`)
        .eq('status', 'publicado')
        .order('created_at', { ascending: false });
      if (!error && data) setAll(data as PropertyWithRelations[]);
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    return all.filter((p) => {
      if (q) {
        const hay = `${p.titulo} ${p.cidade} ${p.bairro} ${p.descricao}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (tipo) {
        if (!p.pricing?.some((pr) => pr.tipo === tipo)) return false;
      }
      if (priceRange) {
        const range = PRICE_RANGES.find((r) => r.id === priceRange);
        if (range && p.pricing && p.pricing.length > 0) {
          const lowest = Math.min(...p.pricing.map((pr) => Number(pr.preco)));
          if (lowest < range.min || lowest > range.max) return false;
        } else if (range) {
          return false;
        }
      }
      if (guests) {
        const g = parseInt(guests, 10);
        if (!isNaN(g) && p.capacidade < g) return false;
      }
      if (selectedAmenities.length > 0) {
        const names = p.amenities?.map((a) => a.amenity_name) ?? [];
        if (!selectedAmenities.every((a) => names.includes(a))) return false;
      }
      return true;
    });
  }, [all, q, tipo, priceRange, guests, selectedAmenities]);

  const activeFilters =
    (tipo ? 1 : 0) + (priceRange ? 1 : 0) + (guests ? 1 : 0) + selectedAmenities.length;

  function clearAll() {
    setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true });
  }

  return (
    <div className="container-app py-8">
      {/* Search header */}
      <div className="mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); updateParam('q', (f.get('q') as string) ?? ''); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por cidade, bairro ou nome…"
              className="input pl-12"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="btn-outline lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
            {activeFilters > 0 && <span className="ml-1 rounded-full bg-emerald-600 text-white text-xs px-1.5">{activeFilters}</span>}
          </button>
        </form>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Filters sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="card p-5 lg:sticky lg:top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Filtros</h3>
              {activeFilters > 0 && (
                <button onClick={clearAll} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">Tipo de locação</label>
                <div className="space-y-1.5">
                  {RENTAL_TYPES.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="tipo"
                        checked={tipo === r.id}
                        onChange={() => updateParam('tipo', tipo === r.id ? '' : r.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-stone-700">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Faixa de preço</label>
                <div className="space-y-1.5">
                  {PRICE_RANGES.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="preco"
                        checked={priceRange === r.id}
                        onChange={() => updateParam('preco', priceRange === r.id ? '' : r.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-stone-700">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Hóspedes</label>
                <select
                  value={guests}
                  onChange={(e) => updateParam('hospedes', e.target.value)}
                  className="input"
                >
                  <option value="">Qualquer</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="4">4+</option>
                  <option value="6">6+</option>
                  <option value="8">8+</option>
                </select>
              </div>

              <div>
                <label className="label">Comodidades</label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {AMENITIES.map((a) => {
                    const checked = selectedAmenities.includes(a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => updateParam('comodidade', a.id, { multi: true, remove: checked })}
                          className="accent-emerald-600"
                        />
                        <AmenityIcon name={a.icon} className="h-4 w-4 text-stone-400" />
                        <span className="text-stone-700">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-stone-600">
              {loading ? 'Buscando…' : `${results.length} ${results.length === 1 ? 'acomodação' : 'acomodações'} encontrada${results.length === 1 ? '' : 's'}`}
              {q && <> para <span className="font-semibold text-stone-800">"{q}"</span></>}
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-stone-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-3/4" />
                    <div className="h-3 bg-stone-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<HomeIcon className="h-12 w-12" />}
              title="Nenhuma acomodação encontrada"
              description="Tente ajustar os filtros ou buscar por outra cidade."
              action={<button onClick={clearAll} className="btn-outline">Limpar filtros</button>}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
