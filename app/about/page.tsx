'use client'

import { Box, Typography, useTheme, alpha } from '@mui/material'
import Navbar from '@/components/nav-and-sidemenu/navbar'

interface AboutSectionProps {
  title: string
  titleId: string
  children: React.ReactNode
}

const AboutSection = ({ title, titleId, children }: AboutSectionProps) => {
  const theme = useTheme()

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{
        width: { xs: '95%', sm: '80%', md: '60%' },
        bgcolor: 'background.paper',
        padding: { xs: '1.5rem', sm: '2rem' },
        borderRadius: '8px',
        boxShadow: theme.shadows[1],
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: theme =>
          theme.palette.mode === 'dark' ? alpha(theme.palette.grey[700], 0.3) : 'transparent',
      }}
    >
      <Typography id={titleId} variant="h5" sx={{ marginBottom: '1rem', color: 'primary.main' }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

const About = () => {
  const theme = useTheme()

  return (
    <>
      <Navbar displaySideMenu={false} isSideMenuOpen={false} handleMenuOpen={() => {}} />
      <Box
        aria-label="About Knowledge Grapht"
        sx={{
          marginTop: '70px',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 3, sm: 4 },
          alignItems: 'center',
          minHeight: '100vh',
          padding: { xs: '1rem', sm: '2rem' },
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{
            borderBottom: `2px solid ${theme.palette.primary.main}`,
            color: 'primary.main',
            marginBottom: '1rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          About Knowledge Grapht
        </Typography>

        <AboutSection title="Our Mission" titleId="mission-title">
          <Typography variant="body1" component="p">
            Students retain information best when they consistently review it and practice applying
            it through spaced-repetition exercises. Knowledge Grapht is a service that empowers
            professors to create customized review lessons for their courses and enables students to
            reinforce their knowledge at their own pace. Our mission is to enhance the learning
            experience by providing a platform that fosters deeper understanding and retention of
            course material through spaced-repetition exercises and classroom gamification
          </Typography>
        </AboutSection>

        <AboutSection title="Knowledge Graph Technology" titleId="technology-title">
          <Typography variant="body1" component="p">
            At the heart of Knowledge Grapht is our knowledge graph system. This powerful feature
            allows professors to create visual representations of course concepts and their
            interconnections. Essentially, the knowkedge graph provides a visual {'roadmap'} for
            what students will learn and how course topics will build on each other. Each node
            represents a key concept, while edges show prerequisite relationships between topics.
            For instance, in an introductory computer science course, concepts like
            {" 'loops'"} and {"'arrays'"} are connected to show their learning dependencies.
          </Typography>
        </AboutSection>

        <AboutSection title="AI-Powered Learning Insights" titleId="ai-title">
          <Typography variant="body1" component="p">
            As students progress through lessons and answer questions, our intelligent system
            continuously tracks and analyzes their performance within the context of the class’s
            knowledge graph. This data provides valuable insights into individual and group learning
            patterns, helping professors identify concepts that students find challenging. With this
            information, professors can create targeted review materials to address specific areas
            of difficulty. Our AI-driven analytics also offer personalized recommendations for
            curriculum adjustments, ensuring that teaching strategies are optimized for student
            success. Additionally, the system highlights areas where students may need extra
            support, enabling professors to intervene early and provide the necessary resources for
            improvement and allowing students to visually see which concepts they have mastered and
            which ones need more attention.
          </Typography>
        </AboutSection>

        <AboutSection title="Gamification and Engagement" titleId="gamification-title">
          <Typography variant="body1" component="p">
            Knowledge Grapht incorporates gamification elements to enhance student engagement and
            motivation. By transforming learning into an interactive experience, we aim to make
            studying more enjoyable and effective. Students can earn rewards, unlock achievements,
            and track their progress over time, fostering a sense of accomplishment and continuous
            improvement.
          </Typography>
        </AboutSection>

        <AboutSection title="Knowledge Grapht Mobile App" titleId="mobile-title">
          <Typography variant="body1" component="p">
            The Knowledge Grapht mobile app empowers students to review course material and complete
            exercises on the go, aiming to seamlessly integrate learning into their busy schedules.
            With an intuitive interface and responsive design, the app enables students to engage
            with their spaced-repetition lessons anytime, anywhere. Whether they have a few minutes
            between classes or are studying on their commute, they can reinforce key concepts, and
            track their progress with ease. By making learning more accessible and flexible, the app
            helps students build lasting knowledge at their own pace.
          </Typography>
          <Typography variant="body2" component="p" sx={{ marginTop: '1rem' }}>
            <strong>
              NOTE: The mobile app is currently in development, and we are excited to share more
              details soon!
            </strong>
          </Typography>
        </AboutSection>

        <AboutSection title="Knowledge Grapht Web App" titleId="web-title">
          <Typography variant="body1" component="p">
            The Knowledge Grapht web app is designed to help professors create, manage, and optimize
            their courses with ease. It features a user-friendly interface for building interactive
            knowledge graphs, setting up spaced-repetition lessons, and tracking student progress.
            Professors can customize course materials to align with their curriculum, tailor review
            exercises to address student needs, and gain valuable insights into learning outcomes
            through detailed analytics. The platform simplifies course management while enhancing
            student engagement, making it a powerful tool for fostering deeper learning and
            retention
          </Typography>
        </AboutSection>
      </Box>
    </>
  )
}

export default About
