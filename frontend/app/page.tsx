import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Phonics Blending</h1>
        <p className="text-gray-600 mb-8">Learn English pronunciation by blending phonemes</p>
        <Link
          href="/game"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </Link>
      </div>
    </main>
  );
}
