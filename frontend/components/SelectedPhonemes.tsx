'use client';

interface Props {
  selected: string[];
  onRemove: (index: number) => void;
}

export default function SelectedPhonemes({ selected, onRemove }: Props) {
  return (
    <div className="flex gap-3 min-h-[5rem] items-center justify-center flex-wrap p-4 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
      {selected.length === 0 ? (
        <span className="text-gray-400 text-sm">Click phonemes to build a word</span>
      ) : (
        selected.map((symbol, i) => (
          <button
            key={i}
            onClick={() => onRemove(i)}
            className="w-16 h-16 bg-blue-100 text-blue-700 rounded-xl text-xl font-bold border-2 border-blue-400 hover:bg-red-100 hover:border-red-400 hover:text-red-600 transition-colors"
            title="Remove"
          >
            {symbol}
          </button>
        ))
      )}
    </div>
  );
}
