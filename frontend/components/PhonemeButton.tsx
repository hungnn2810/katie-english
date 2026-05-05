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
          ? 'bg-primary text-white border-[#3B8AEA] scale-95 shadow-inner'
          : 'bg-white text-primary border-primary/40 hover:border-primary hover:bg-primary/10 shadow-md'}
      `}
    >
      {symbol}
      <button
        onClick={playAudio}
        className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full text-xs flex items-center justify-center hover:bg-[#F5C040] shadow"
        title="Play sound"
      >
        ▶
      </button>
    </button>
  );
}
