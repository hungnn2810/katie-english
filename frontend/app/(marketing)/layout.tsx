import type { Metadata } from 'next';

const title = 'Lớp Tiếng Anh Cô Katie | Dạy Tiếng Anh Trẻ Em';
const description =
  'Lớp tiếng Anh cho trẻ em 6–12 tuổi tại Hà Nội. Cô Katie dạy tiếng Anh phát âm chuẩn, bài tập số hoá, chấm điểm tự động. Đăng ký học thử ngay!';

export const metadata: Metadata = {
  title,
  description,
  keywords: ['tiếng Anh trẻ em', 'lớp tiếng Anh', 'cô Katie', 'dạy tiếng Anh', 'Hà Nội'],
  openGraph: {
    title,
    description,
    type: 'website',
    url: 'https://katie.vn',
    images: [
      {
        url: 'https://katie.vn/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Lớp tiếng Anh cô Katie',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['https://katie.vn/og-image.jpg'],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
