interface Props {
  isCorrect: boolean;
  correctAnswer: string[];
}

export default function ResultBanner({ isCorrect, correctAnswer }: Props) {
  return (
    <div
      className={`p-4 rounded-2xl text-center font-semibold text-lg ${
        isCorrect ? 'bg-green-100 text-green-700 border-2 border-green-400' : 'bg-red-100 text-red-700 border-2 border-red-400'
      }`}
    >
      {isCorrect ? (
        <span>Correct! Well done!</span>
      ) : (
        <span>
          Not quite. Correct answer:{' '}
          <span className="font-bold">{correctAnswer.join(' - ')}</span>
        </span>
      )}
    </div>
  );
}
