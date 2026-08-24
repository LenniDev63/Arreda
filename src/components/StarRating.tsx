import { Star } from 'lucide-react';

interface Props {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
}

export function StarRating({ value, size = 20, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? 'transition-transform hover:scale-110' : 'cursor-default'}
          aria-label={`${n} estrelas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? 'fill-orange-400 text-orange-400' : 'text-stone-300'}
          />
        </button>
      ))}
    </div>
  );
}
