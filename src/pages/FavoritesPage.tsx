import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFavoriteProperties } from '@/lib/queries';
import type { PropertyWithRelations } from '@/lib/types';
import { PropertyCard } from '@/components/PropertyCard';
import { EmptyState } from '@/components/EmptyState';
import { Link } from 'react-router-dom';

export default function FavoritesPage() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<PropertyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchFavoriteProperties(profile.id)
      .then(setFavorites)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Meus favoritos</h1>
        <p className="text-sm text-stone-500">{favorites.length} imóvel(is) salvo(s)</p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-12 w-12" />}
          title="Nenhum favorito ainda"
          description="Toque no coração nos imóveis que você gostou para salvá-los aqui."
          action={<Link to="/buscar" className="btn-primary">Explorar imóveis</Link>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
