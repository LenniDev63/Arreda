import {
  Wifi, ChefHat, Car, Wind, Waves, Tv, Refrigerator, WashingMachine,
  Flame, Trees, PawPrint, ThermometerSun, Check, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Wifi, ChefHat, Car, Wind, Waves, Tv, Refrigerator, WashingMachine,
  Flame, Trees, PawPrint, ThermometerSun,
};

export function AmenityIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Check;
  return <Icon className={className} />;
}
