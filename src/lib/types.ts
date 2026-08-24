export type UserType = 'client' | 'owner';

export type RentalType = 'diaria' | 'semanal' | 'mensal';

export type BookingStatus =
  | 'pendente'
  | 'aguardando_pagamento'
  | 'paga'
  | 'confirmada'
  | 'recusada'
  | 'cancelada'
  | 'concluida';

export interface Profile {
  id: string;
  nome: string;
  tipo: UserType;
  avatar_url: string | null;
  telefone: string | null;
  cpf_cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export type PropertyStatus = 'publicado' | 'rascunho';

export interface Property {
  id: string;
  owner_id: string;
  titulo: string;
  descricao: string;
  cidade: string;
  bairro: string;
  endereco: string;
  quartos: number;
  banheiros: number;
  capacidade: number;
  regras: string;
  politica_cancelamento: string;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  url: string;
  ordem: number;
  created_at: string;
}

export interface PropertyAmenity {
  id: string;
  property_id: string;
  amenity_name: string;
  created_at: string;
}

export interface RentalPricing {
  id: string;
  property_id: string;
  tipo: RentalType;
  preco: number;
  created_at: string;
}

export interface AvailabilityBlock {
  id: string;
  property_id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  created_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  client_id: string;
  tipo_locacao: RentalType;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  property_id: string;
  client_id: string;
  nota: number;
  comentario: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface PropertyWithRelations extends Property {
  owner?: Profile;
  photos?: PropertyPhoto[];
  amenities?: PropertyAmenity[];
  pricing?: RentalPricing[];
  reviews?: Review[];
}

export interface BookingWithRelations extends Booking {
  property?: PropertyWithRelations;
  client?: Profile;
}
