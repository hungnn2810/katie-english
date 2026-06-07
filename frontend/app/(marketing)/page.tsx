import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h1">Lớp Tiếng Anh Cô Katie</Typography>
      </Box>
    </main>
  );
}
