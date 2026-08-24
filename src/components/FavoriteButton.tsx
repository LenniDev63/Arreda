import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Props {
  propertyId: string;
  className?: string;
}

export function FavoriteButton({ propertyId, className = '' }: Props) {
  const { profile } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', profile.id)
      .eq('property_id', propertyId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFav(!!data);
        setLoading(false);
      });
  }, [profile, propertyId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!profile || toggling) return;
    setToggling(true);
    try {
      if (isFav) {
        await supabase.from('favorites').delete().eq('user_id', profile.id).eq('property_id', propertyId);
        setIsFav(false);
      } else {
        await supabase.from('favorites').insert({ user_id: profile.id, property_id: propertyId });
        setIsFav(true);
      }
    } catch { /* ignore */ }
    setToggling(false);
  }

  if (!profile) return null;

  return (
    <button
      onClick={toggle}
      disabled={toggling || loading}
      aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition hover:scale-110 ${className}`}
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
      ) : (
        <Heart
          className={`h-4 w-4 transition ${isFav ? 'fill-red-500 text-red-500' : 'text-stone-600'}`}
        />
      )}
    </button>
  );
}
