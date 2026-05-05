'use client';

interface Props {
  selected: string[];
  onRemove: (index: number) => void;
}

export default function SelectedPhonemes({ selected, onRemove }: Props) {
  return (
    <div className="flex gap-3 min-h-[5rem] items-center justify-center flex-wrap p-4 bg-background rounded-2xl border-2 border-dashed border-border">
      {selected.length === 0 ? (
        <span className="text-textSecondary text-sm">Click phonemes to build a word</span>
      ) : (
        selected.map((symbol, i) => (
          <button
            key={i}
            onClick={() => onRemove(i)}
            className="w-16 h-16 bg-primary/20 text-primary rounded-xl text-xl font-bold border-2 border-primary/60 hover:bg-highlight/20 hover:border-highlight hover:text-highlight transition-colors"
            title="Remove"
          >
            {symbol}
          </button>
        ))
      )}
    </div>
  );
}
