import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AnimatedSection from './AnimatedSection';
import StudentResultCard from './StudentResultCard';
import { studentResults } from '../data/content';

export default function StudentResultsSection() {
  return (
    <Box
      component="section"
      sx={{ backgroundColor: 'background.default', py: { xs: 4, md: 8 } }}
    >
      <Container maxWidth="lg">
        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{ mb: 4, textAlign: 'center' }}
          >
            Học sinh nói gì sau khi học
          </Typography>
        </AnimatedSection>
        <Grid container spacing={3}>
          {studentResults.map((result) => (
            <Grid key={result.id} size={{ xs: 12, md: 4 }}>
              <StudentResultCard
                studentName={result.studentName}
                before={result.before}
                after={result.after}
                achievement={result.achievement}
                period={result.period}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
