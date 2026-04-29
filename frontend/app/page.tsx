import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Katie English</h1>
        <p className="text-gray-600 mb-8">Learn English pronunciation by blending phonemes</p>
        <div className="flex flex-col gap-3 items-center">
          <Link href="/game" className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors w-48 text-center">
            Phonics Game
          </Link>
          <Link href="/game/homework" className="bg-green-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors w-48 text-center">
            Homework
          </Link>
          <Link href="/admin" className="text-gray-400 text-sm hover:text-gray-600 mt-2">
            Admin Panel
          </Link>
        </div>
      </div>
    </main>
  );
}
