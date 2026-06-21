import HeroSection from './components/HeroSection';
import TeacherProfileSection from './components/TeacherProfileSection';
import StudentResultsSection from './components/StudentResultsSection';
import TestimonialCarousel from './components/TestimonialCarousel';
import SoftwareSection from './components/SoftwareSection';
import ContactCTASection from './components/ContactCTASection';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Lớp Tiếng Anh Cô Katie',
  url: 'https://katie-english.com.vn',
  telephone: '+84-xxx-xxx-xxxx',
  address: { '@type': 'PostalAddress', addressLocality: 'Hà Nội', addressCountry: 'VN' },
  description: 'Lớp tiếng Anh cho trẻ 6-12 tuổi',
};

export default function MarketingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <HeroSection />
        <TeacherProfileSection />
        <StudentResultsSection />
        <TestimonialCarousel />
        <SoftwareSection />
        <ContactCTASection />
      </main>
    </>
  );
}
