import LogoSections from "./sections/LogoSections";
import NavBar from "./components/NavBar";
import Hero from "./sections/hero"
import ShowcaseSection from "./sections/ShowcaseSection"
import FeatureCards from "./sections/FeatureCards";
import ExperienceSection from "./sections/ExperienceSection";
import TechStack from "./sections/TechStack";
import Testimonials from "./sections/Testimonials";

const app = () => {
    return (
        <>
            <NavBar />
            <Hero />
            <ShowcaseSection />
            <LogoSections />
            <FeatureCards />
            <ExperienceSection />
            <TechStack />
            <Testimonials />

        </>


    )
}

export default app;