import { supabase } from './supabase';
import type { PropertyWithRelations, BookingWithRelations, AvailabilityBlock } from './types';

export async function fetchProperty(id: string): Promise<PropertyWithRelations | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      owner:profiles!properties_owner_id_fkey(id, nome, avatar_url, tipo),
      photos:property_photos(*),
      amenities:property_amenities(*),
      pricing:rental_pricing(*),
      reviews:reviews(*)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as PropertyWithRelations | null;
}

export async function fetchAvailability(propertyId: string): Promise<AvailabilityBlock[]> {
  const [{ data: blocks, error: e1 }, { data: bookings, error: e2 }] = await Promise.all([
    supabase.from('availability_blocks').select('*').eq('property_id', propertyId),
    supabase
      .from('bookings')
      .select('id, property_id, data_inicio, data_fim, created_at')
      .eq('property_id', propertyId)
      .in('status', ['pendente', 'aguardando_pagamento', 'paga', 'confirmada'])
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const bookingBlocks: AvailabilityBlock[] = (bookings ?? []).map((b) => ({
    id: b.id,
    property_id: b.property_id,
    data_inicio: b.data_inicio,
    data_fim: b.data_fim,
    motivo: 'reserva',
    created_at: b.created_at,
  }));

  return [...(blocks ?? []), ...bookingBlocks];
}

export async function fetchClientBookings(clientId: string): Promise<BookingWithRelations[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties(
        *, photos:property_photos(*), pricing:rental_pricing(*)
      )
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingWithRelations[];
}

export async function fetchOwnerBookings(ownerId: string): Promise<BookingWithRelations[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties!inner(id, titulo, cidade, bairro, owner_id, photos:property_photos(*)),
      client:profiles!bookings_client_id_fkey(id, nome, avatar_url, telefone)
    `)
    .eq('property.owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingWithRelations[];
}

export async function fetchOwnerProperties(ownerId: string): Promise<PropertyWithRelations[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      photos:property_photos(*),
      pricing:rental_pricing(*),
      reviews:reviews(nota)
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PropertyWithRelations[];
}

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('property_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.property_id));
}

export async function fetchFavoriteProperties(userId: string): Promise<PropertyWithRelations[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      property:properties(
        *, photos:property_photos(*), amenities:property_amenities(*),
        pricing:rental_pricing(*), reviews:reviews(nota)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { property: PropertyWithRelations }[];
  return rows.map((f) => f.property).filter(Boolean);
}

export async function toggleFavorite(userId: string, propertyId: string, isFav: boolean): Promise<boolean> {
  if (isFav) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, property_id: propertyId });
  if (error) throw error;
  return true;
}
