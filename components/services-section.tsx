"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { GraduationCap, Rocket, Building2, Globe, Shield, ArrowUpRight } from "lucide-react"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}

const services = [
  {
    icon: GraduationCap,
    number: "01",
    title: "Digital Skills Training",
    description:
      "Free, instructor-led programmes in digital literacy, software engineering, design, AI, and blockchain. Our four-stage learning framework — Foundations, Core Tech, Emerging Tech, Deploy & Earn — runs ad-hoc open sessions where learners choose what to attend.",
    capabilities: ["Four-Stage Framework", "Product Design", "AI & Blockchain", "Digital Literacy"],
    colSpan: "lg:col-span-2",
  },
  {
    icon: Rocket,
    number: "02",
    title: "Venture Studio",
    description:
      "No accelerator. No VC fund. No pipeline from idea to investable startup. We built one. Our hybrid venture studio scouts problems, incubates founders, and spins out companies — with $30-50K in staged capital, shared infrastructure, and hands-on co-building.",
    capabilities: ["Build-First Model", "Staged Capital", "Shared Infrastructure", "Co-Building"],
    colSpan: "lg:col-span-1",
  },
  {
    icon: Shield,
    number: "03",
    title: "Sovereign Digital Infrastructure",
    description:
      "Technical implementation partner for Sierra Leone\u2019s sovereign blockchain infrastructure. Working with MoCTI and the SIGN Foundation on national digital identity, digital payments, and asset tokenisation. The only private sector member of the National Digital Development Council.",
    capabilities: ["NDDC Seat", "SIGN Partnership", "Digital Identity", "Policy Advisory"],
    colSpan: "lg:col-span-1",
  },
  {
    icon: Building2,
    number: "04",
    title: "Digital Public Goods",
    description:
      "Building open-source infrastructure for transparent governance. Our DPG Accelerator helps Sierra Leonean startups meet the 9 Digital Public Goods Standard criteria. We also build civic tech: SAMS for government asset management, and a blockchain-based IP registry.",
    capabilities: ["DPG Accelerator", "SAMS Platform", "IP Registry", "Open Source"],
    colSpan: "lg:col-span-2",
  },
  {
    icon: Globe,
    number: "05",
    title: "Innovation Hub & Community",
    description:
      "Sierra Leone\u2019s 2025 Innovation Hub of the Year. A 216m\u00B2 facility in Freetown with co-working, classrooms, and studio space — the physical anchor for hackathons, bounty programmes, and the Sinai mentorship initiative.",
    capabilities: ["216m\u00B2 Facility", "Hackathons", "Bounty Programme", "Mentorship"],
    colSpan: "lg:col-span-3",
  },
]

export function ServicesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const isMobile = useIsMobile()

  return (
    <section id="services" ref={ref} className="py-16 lg:py-32 bg-background relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 relative"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-[1px] bg-primary"></div>
              <span className="font-mono text-xs tracking-widest uppercase text-primary">What We Do</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-light text-foreground text-balance leading-tight">
              Building Africa&apos;s digital future through <span className="text-muted-foreground">education</span>, <span className="text-muted-foreground">innovation</span>, and <span className="text-muted-foreground">opportunity</span>.
            </h2>
          </div>

          {/* Accent Glow for Header - light orange and spread out */}
          <div className="absolute top-0 -right-24 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen -z-10" />
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const isWide = service.colSpan?.includes("col-span-2")

            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: isMobile ? 0 : index * 0.1 }}
                className={`group relative p-8 lg:p-10 rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 overflow-hidden ${service.colSpan}`}
              >
                {/* Hover Tech Pattern - Kept as it is unique to Services but blending with About style */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* EXACT Gradient from About Us */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <span className="absolute top-8 right-8 lg:top-10 lg:right-10 font-mono text-xs tracking-widest text-muted-foreground/50 z-20">
                  {service.number}
                </span>

                <div
                  className={`relative z-10 h-full ${isWide ? "lg:grid lg:grid-cols-2 lg:gap-12" : "flex flex-col"}`}
                >
                  {/* Header / Left Side */}
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="mb-8">
                        <div className="inline-flex p-3 bg-secondary rounded-xl text-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors duration-500">
                          <service.icon size={28} strokeWidth={1.5} />
                        </div>
                      </div>

                      <h3 className="text-2xl font-normal text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                        {service.title}
                      </h3>
                    </div>

                    {!isWide ? (
                      <>
                        <p className="text-muted-foreground leading-relaxed mb-8 flex-grow">{service.description}</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {service.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-transparent group-hover:border-primary/20 transition-colors"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      /* Tags moved to bottom-left for wide cards */
                      <div className="flex flex-wrap gap-2 mt-8 lg:mt-0">
                        {service.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-transparent group-hover:border-primary/20 transition-colors"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content / Right Side (Only for Wide Cards) */}
                  {isWide && (
                    <div className="flex flex-col justify-center h-full pt-2 lg:pt-0">
                      <p className="text-muted-foreground leading-relaxed text-lg font-light">{service.description}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Background Decor - moved to end and removed overflow-hidden for seamless blend */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-48 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Gradient fade for smooth mobile transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none lg:hidden" />
    </section>
  )
}
