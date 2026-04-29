import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MINIO_BASE = process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000/phonics-audio';

async function main() {
  await prisma.wordPhoneme.deleteMany();
  await prisma.word.deleteMany();
  await prisma.phoneme.deleteMany();

  const phonemes = await prisma.phoneme.createMany({
    data: [
      { symbol: 'c',  audioUrl: `${MINIO_BASE}/phonemes/c.mp3`,  type: 'consonant' },
      { symbol: 'a',  audioUrl: `${MINIO_BASE}/phonemes/a.mp3`,  type: 'vowel' },
      { symbol: 't',  audioUrl: `${MINIO_BASE}/phonemes/t.mp3`,  type: 'consonant' },
      { symbol: 'd',  audioUrl: `${MINIO_BASE}/phonemes/d.mp3`,  type: 'consonant' },
      { symbol: 'o',  audioUrl: `${MINIO_BASE}/phonemes/o.mp3`,  type: 'vowel' },
      { symbol: 'g',  audioUrl: `${MINIO_BASE}/phonemes/g.mp3`,  type: 'consonant' },
      { symbol: 'sh', audioUrl: `${MINIO_BASE}/phonemes/sh.mp3`, type: 'digraph' },
      { symbol: 'i',  audioUrl: `${MINIO_BASE}/phonemes/i.mp3`,  type: 'vowel' },
      { symbol: 'p',  audioUrl: `${MINIO_BASE}/phonemes/p.mp3`,  type: 'consonant' },
    ],
    skipDuplicates: true,
  });

  console.log(`Created ${phonemes.count} phonemes`);

  const getPhoneme = async (symbol: string) =>
    prisma.phoneme.findUniqueOrThrow({ where: { symbol } });

  const words = [
    {
      text: 'cat',
      audioUrl: `${MINIO_BASE}/words/cat.mp3`,
      difficulty: 1,
      phonemes: ['c', 'a', 't'],
    },
    {
      text: 'dog',
      audioUrl: `${MINIO_BASE}/words/dog.mp3`,
      difficulty: 1,
      phonemes: ['d', 'o', 'g'],
    },
    {
      text: 'ship',
      audioUrl: `${MINIO_BASE}/words/ship.mp3`,
      difficulty: 2,
      phonemes: ['sh', 'i', 'p'],
    },
  ];

  for (const wordData of words) {
    const word = await prisma.word.create({
      data: {
        text: wordData.text,
        audioUrl: wordData.audioUrl,
        difficulty: wordData.difficulty,
      },
    });

    for (let i = 0; i < wordData.phonemes.length; i++) {
      const phoneme = await getPhoneme(wordData.phonemes[i]);
      await prisma.wordPhoneme.create({
        data: {
          wordId: word.id,
          phonemeId: phoneme.id,
          orderIndex: i,
        },
      });
    }

    console.log(`Created word: ${word.text}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
