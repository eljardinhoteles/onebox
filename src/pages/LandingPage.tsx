import { Box, Divider } from '@mantine/core';
import { LandingHeader } from './landing/components/LandingHeader';
import { HeroSection } from './landing/components/HeroSection';
import { ProblemSection } from './landing/components/ProblemSection';
import { FeaturesAndUseCasesSection } from './landing/components/FeaturesAndUseCasesSection';
import { AccountantSection } from './landing/components/AccountantSection';
import { PricingSection } from './landing/components/PricingSection';
import { FinalCtaAndFooter } from './landing/components/FinalCtaAndFooter';
import './landing/LandingPage.css';

export function LandingPage() {
    return (
        <Box className="landing-wrapper">
            <LandingHeader />
            <HeroSection />
            <Divider color="gray.1" />
            <ProblemSection />
            <FeaturesAndUseCasesSection />
            <AccountantSection />
            <Divider color="gray.1" />
            <PricingSection />
            <FinalCtaAndFooter />
        </Box>
    );
}
