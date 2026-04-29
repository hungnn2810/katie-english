'use client';

interface Props {
  symbol: string;
  audioUrl: string;
  selected: boolean;
  onClick: () => void;
}

export default function PhonemeButton({ symbol, audioUrl, selected, onClick }: Props) {
  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative w-20 h-20 rounded-2xl text-2xl font-bold border-2 transition-all select-none
        ${selected
          ? 'bg-blue-600 text-white border-blue-700 scale-95 shadow-inner'
          : 'bg-white text-blue-600 border-blue-300 hover:border-blue-500 hover:bg-blue-50 shadow-md'}
      `}
    >
      {symbol}
      <button
        onClick={playAudio}
        className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full text-xs flex items-center justify-center hover:bg-yellow-500 shadow"
        title="Play sound"
      >
        ▶
      </button>
    </button>
  );
}
