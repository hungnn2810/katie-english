import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import AnimatedSection from './AnimatedSection';
import { softwareFeatures, softwareScreenshots } from '../data/content';

export default function SoftwareSection() {
  return (
    <Box
      component="section"
      sx={{ backgroundColor: 'background.paper', py: { xs: 4, md: 8 } }}
    >
      <Container maxWidth="lg">
        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{ mb: 4, textAlign: 'center' }}
          >
            Phần mềm hỗ trợ học tập
          </Typography>
        </AnimatedSection>
        <Grid container spacing={4} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <List disablePadding>
              {softwareFeatures.map((feature) => (
                <ListItem key={feature} disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <CheckCircle2 size={20} color="#4F9DFF" style={{ minWidth: 32 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={feature}
                    slotProps={{ primary: { style: { fontWeight: 700 } } }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            {softwareScreenshots.map((screenshot, index) => (
              <Paper
                key={screenshot.src}
                elevation={2}
                sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}
              >
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={screenshot.width}
                  height={screenshot.height}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  priority={index === 0}
                />
              </Paper>
            ))}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
