import HeroSection from './components/HeroSection';
import TeacherProfileSection from './components/TeacherProfileSection';
import StudentResultsSection from './components/StudentResultsSection';
import TestimonialCarousel from './components/TestimonialCarousel';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Lớp Tiếng Anh Cô Katie',
  url: 'https://katie.vn',
  telephone: '+84-xxx-xxx-xxxx',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Hà Nội',
    addressCountry: 'VN',
  },
  description: 'Lớp tiếng Anh cho trẻ 6-12 tuổi',
};

export default function MarketingPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <TeacherProfileSection />
      <StudentResultsSection />
      <TestimonialCarousel />
    </main>
  );
}
