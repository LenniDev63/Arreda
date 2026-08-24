import type { RentalType, BookingStatus } from './types';

export const AMENITIES: { id: string; label: string; icon: string }[] = [
  { id: 'wifi', label: 'Wi-Fi', icon: 'Wifi' },
  { id: 'cozinha', label: 'Cozinha', icon: 'ChefHat' },
  { id: 'estacionamento', label: 'Estacionamento', icon: 'Car' },
  { id: 'ar-condicionado', label: 'Ar-condicionado', icon: 'Wind' },
  { id: 'piscina', label: 'Piscina', icon: 'Waves' },
  { id: 'tv', label: 'TV', icon: 'Tv' },
  { id: 'geladeira', label: 'Geladeira', icon: 'Refrigerator' },
  { id: 'lavanderia', label: 'Lavanderia', icon: 'WashingMachine' },
  { id: 'churrasqueira', label: 'Churrasqueira', icon: 'Flame' },
  { id: 'area-externa', label: 'Área externa', icon: 'Trees' },
  { id: 'pet-friendly', label: 'Pet friendly', icon: 'PawPrint' },
  { id: 'aquecedor', label: 'Aquecedor', icon: 'ThermometerSun' },
];

export const RENTAL_TYPES: { id: RentalType; label: string; unit: string }[] = [
  { id: 'diaria', label: 'Diária', unit: 'noite' },
  { id: 'semanal', label: 'Semanal', unit: 'semana' },
  { id: 'mensal', label: 'Mensal', unit: 'mês' },
];

export const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  aguardando_pagamento: { label: 'Aguardando pagamento', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  paga: { label: 'Paga', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  confirmada: { label: 'Confirmada', color: 'bg-green-100 text-green-800 border-green-200' },
  recusada: { label: 'Recusada', color: 'bg-red-100 text-red-800 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-200 text-gray-700 border-gray-300' },
  concluida: { label: 'Concluída', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export const CANCEL_DAYS_FULL_REFUND = 3;

export function rentalTypeLabel(t: RentalType): string {
  return RENTAL_TYPES.find((r) => r.id === t)?.label ?? t;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
