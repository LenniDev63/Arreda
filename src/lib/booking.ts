import type { RentalType, RentalPricing, AvailabilityBlock } from './types';

export function parseLocalDate(val: string | Date): Date {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const str = String(val).split('T')[0];
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function nightsBetween(start: Date, end: Date): number {
  const s = parseLocalDate(start).getTime();
  const e = parseLocalDate(end).getTime();
  const ms = e - s;
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function weeksBetween(start: Date, end: Date): number {
  return Math.max(1, Math.ceil(nightsBetween(start, end) / 7));
}

export function monthsBetween(start: Date, end: Date): number {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

export function unitsBetween(tipo: RentalType, start: Date, end: Date): number {
  if (tipo === 'diaria') return nightsBetween(start, end);
  if (tipo === 'semanal') return weeksBetween(start, end);
  return monthsBetween(start, end);
}

export function unitLabel(tipo: RentalType, count: number): string {
  if (tipo === 'diaria') return count === 1 ? '1 diária' : `${count} diárias`;
  if (tipo === 'semanal') return count === 1 ? '1 semana' : `${count} semanas`;
  return count === 1 ? '1 mês' : `${count} meses`;
}

export function calculateTotal(
  tipo: RentalType,
  start: Date,
  end: Date,
  pricing: RentalPricing[]
): number {
  const priceRow = pricing.find((p) => p.tipo === tipo);
  if (!priceRow) return 0;
  const units = unitsBetween(tipo, start, end);
  return Math.round(Number(priceRow.preco) * units * 100) / 100;
}

export interface PriceBreakdownItem {
  label: string;
  amount: number;
}

export interface SmartTotalResult {
  totalAmount: number;
  nights: number;
  primaryTipo: RentalType;
  breakdown: PriceBreakdownItem[];
  error?: string;
}

export function calculateSmartTotal(
  start: Date,
  end: Date,
  pricing: RentalPricing[]
): SmartTotalResult {
  const nights = nightsBetween(start, end);
  if (nights <= 0) {
    return { totalAmount: 0, nights: 0, primaryTipo: 'diaria', breakdown: [] };
  }

  const daily = pricing.find((p) => p.tipo === 'diaria');
  const weekly = pricing.find((p) => p.tipo === 'semanal');
  const monthly = pricing.find((p) => p.tipo === 'mensal');

  const breakdown: PriceBreakdownItem[] = [];
  let totalAmount = 0;
  let primaryTipo: RentalType = 'diaria';

  if (nights >= 30 && monthly) {
    primaryTipo = 'mensal';
    const fullMonths = Math.floor(nights / 30);
    const extraDays = nights % 30;
    const monthlyTotal = fullMonths * Number(monthly.preco);

    breakdown.push({
      label: `${fullMonths} ${fullMonths === 1 ? 'mês' : 'meses'}`,
      amount: monthlyTotal,
    });
    totalAmount += monthlyTotal;

    if (extraDays > 0 && daily) {
      const extraTotal = extraDays * Number(daily.preco);
      breakdown.push({
        label: `${extraDays} ${extraDays === 1 ? 'diária extra' : 'diárias extras'}`,
        amount: extraTotal,
      });
      totalAmount += extraTotal;
    }
  } else if (nights >= 7 && weekly) {
    primaryTipo = 'semanal';
    const fullWeeks = Math.floor(nights / 7);
    const extraDays = nights % 7;
    const weeklyTotal = fullWeeks * Number(weekly.preco);

    breakdown.push({
      label: `${fullWeeks} ${fullWeeks === 1 ? 'semana' : 'semanas'}`,
      amount: weeklyTotal,
    });
    totalAmount += weeklyTotal;

    if (extraDays > 0 && daily) {
      const extraTotal = extraDays * Number(daily.preco);
      breakdown.push({
        label: `${extraDays} ${extraDays === 1 ? 'diária extra' : 'diárias extras'}`,
        amount: extraTotal,
      });
      totalAmount += extraTotal;
    }
  } else if (daily) {
    primaryTipo = 'diaria';
    const dailyTotal = nights * Number(daily.preco);
    breakdown.push({
      label: `${nights} ${nights === 1 ? 'noite' : 'noites'}`,
      amount: dailyTotal,
    });
    totalAmount += dailyTotal;
  } else {
    return {
      totalAmount: 0,
      nights,
      primaryTipo: 'diaria',
      breakdown: [],
      error: 'Imóvel sem preço cadastrado para este tipo de período.',
    };
  }

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    nights,
    primaryTipo,
    breakdown,
  };
}

export function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isDateBlocked(
  date: Date,
  blocks: AvailabilityBlock[]
): boolean {
  const d = parseLocalDate(date).getTime();
  return blocks.some((b) => {
    const start = parseLocalDate(b.data_inicio).getTime();
    const end = parseLocalDate(b.data_fim).getTime();
    if (b.motivo === 'reserva') {
      // Para reservas, a noite ocupada é a partir da data de inicio até a véspera do checkout
      return d >= start && d < end;
    }
    // Para bloqueio manual do proprietário
    return d >= start && d <= end;
  });
}

export function isRangeAvailable(
  start: Date,
  end: Date,
  blocks: AvailabilityBlock[]
): boolean {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
    if (isDateBlocked(d, blocks)) return false;
  }
  return true;
}

export function todayStr(): string {
  return toDateInputValue(new Date());
}

export function toDateInputValue(date: Date): string {
  const local = parseLocalDate(date);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
