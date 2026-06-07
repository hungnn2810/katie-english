import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { teacherContent } from '../data/content';

export default function TeacherProfileSection() {
  return (
    <Box
      component="section"
      sx={{ backgroundColor: 'background.paper', py: { xs: 4, md: 8 } }}
    >
      <Container maxWidth="sm">
        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{ mb: 4, textAlign: 'center' }}
          >
            {teacherContent.heading}
          </Typography>
        </AnimatedSection>
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              alignItems: { xs: 'center', md: 'flex-start' },
            }}
          >
            <Box sx={{ flexShrink: 0 }}>
              {teacherContent.imageSrc ? (
                <Image
                  src={teacherContent.imageSrc}
                  width={200}
                  height={200}
                  alt={teacherContent.imageAlt}
                  priority={true}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <Avatar
                  sx={{ width: 200, height: 200, fontSize: 64 }}
                >
                  K
                </Avatar>
              )}
            </Box>
            <Box>
              <Typography variant="h3">{teacherContent.name}</Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {teacherContent.bio}
              </Typography>
              <List dense>
                {teacherContent.credentials.map((cred) => (
                  <ListItem key={cred} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircle2 color="#4F9DFF" size={18} />
                    </ListItemIcon>
                    <ListItemText primary={cred} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
