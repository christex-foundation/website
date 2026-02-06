import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { StatsBar } from "@/components/stats-bar"
import { ServicesSection } from "@/components/services-section"
import { BlockchainParallax } from "@/components/blockchain-parallax"
import { AboutSection } from "@/components/about-section"
import { VentureStudioSection } from "@/components/venture-studio-section"
import { PartnersSection } from "@/components/partners-section"
import { ContactSection } from "@/components/contact-section"
import { GallerySection } from "@/components/gallery-section"
import { Footer } from "@/components/footer"
import fs from "fs"
import path from "path"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <StatsBar />
      <ServicesSection />
      <BlockchainParallax />
      <AboutSection />
      <VentureStudioSection />
      <PartnersSection />
      <ContactSection />
      {/* Read images from public/images/gallery if available */}
      {(() => {
        try {
          const galleryDir = path.join(process.cwd(), "public/images/gallery")
          const files = fs.readdirSync(galleryDir).filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
          const localImages = files.map(file => `/images/gallery/${file}`)
          return <GallerySection images={localImages.length > 0 ? localImages : undefined} />
        } catch (e) {
          // Fallback to default images if directory doesn't exist or error
          return <GallerySection />
        }
      })()}
      <Footer />
    </main>
  )
}
