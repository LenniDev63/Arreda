import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Users, Star } from 'lucide-react';
import type { PropertyWithRelations } from '@/lib/types';
import { formatCurrency, rentalTypeLabel } from '@/lib/constants';
import { FavoriteButton } from './FavoriteButton';

interface Props {
  property: PropertyWithRelations;
}

export function PropertyCard({ property }: Props) {
  const photos = property.photos ?? [];
  const cover = photos.length > 0
    ? photos.sort((a, b) => a.ordem - b.ordem)[0].url
    : 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800';

  const pricing = property.pricing ?? [];
  const lowest = pricing.length > 0 ? Math.min(...pricing.map((p) => Number(p.preco))) : 0;
  const cheapestType = pricing.length > 0
    ? pricing.find((p) => Number(p.preco) === lowest)?.tipo
    : undefined;

  const reviews = property.reviews ?? [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.nota, 0) / reviews.length
    : null;

  return (
    <Link
      to={`/imovel/${property.id}`}
      className="group card overflow-hidden hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          src={cover}
          alt={property.titulo}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <FavoriteButton propertyId={property.id} />
        </div>
        {reviews.length > 0 && avgRating && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-sm backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
            {avgRating.toFixed(1)}
            <span className="text-stone-400 font-normal">({reviews.length})</span>
          </div>
        )}
        {cheapestType && (
          <div className="absolute bottom-3 left-3 rounded-full bg-emerald-600/95 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur">
            {rentalTypeLabel(cheapestType)}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-900 line-clamp-2 group-hover:text-emerald-700 transition">
            {property.titulo}
          </h3>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.bairro}, {property.cidade}</span>
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm text-stone-600">
          <span className="flex items-center gap-1"><Bed className="h-4 w-4 text-stone-400" /> {property.quartos}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4 text-stone-400" /> {property.banheiros}</span>
          <span className="flex items-center gap-1"><Users className="h-4 w-4 text-stone-400" /> {property.capacidade}</span>
        </div>
        {lowest > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <span className="text-xs text-stone-500">a partir de</span>
            <p className="text-lg font-bold text-emerald-700">
              {formatCurrency(lowest)}
              <span className="text-xs font-normal text-stone-500"> /{cheapestType === 'diaria' ? 'noite' : cheapestType === 'semanal' ? 'semana' : 'mês'}</span>
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
