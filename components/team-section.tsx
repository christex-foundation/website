"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Grid, Layers, Code, Users } from "lucide-react"

interface TeamMember {
    name: string
    role: string
    category: string
    socials?: { label: string; href: string }[]
    image?: string
}

const team: TeamMember[] = [
    // Management
    {
        name: "David Ogoo",
        role: "Founder",
        category: "Management",
        image: "/images/team/david-ogoo.webp",
        socials: []
    },
    {
        name: "Mahawa Sandy",
        role: "Ops & Strategy Support",
        category: "Management",
        image: "/images/team/mahawa-sandy.webp",
        socials: []
    },
    {
        name: "Nematulai Barrie",
        role: "Comms Lead",
        category: "Management",
        image: "/images/team/nematulai-barrie.webp",
        socials: []
    },
    {
        name: "Francess Beresford-Renner",
        role: "Ops & Strategy Lead",
        category: "Management",
        image: "/images/team/francess-beresford-renner.webp",
        socials: []
    },
    // Design
    {
        name: "Timothy Williams",
        role: "Interaction Designer",
        category: "Design",
        image: "/images/team/timothy-williams.webp",
        socials: []
    },
    {
        name: "Ayorinde John",
        role: "Multimedia Producer",
        category: "Design",
        image: "/images/team/ayorinde-john.webp",
        socials: []
    },
    // Development
    {
        name: "Saidu Bundu-Kamara",
        role: "Software Engineer",
        category: "Development",
        image: "/images/team/saidu-bundu-kamara.webp",
        socials: []
    },
    {
        name: "Mitchel Dennis",
        role: "Software Engineer",
        category: "Development",
        image: "/images/team/mitchel-dennis.webp",
        socials: []
    },
    {
        name: "Eugene John",
        role: "Software Engineer",
        category: "Development",
        image: "/images/team/eugene-john.webp",
        socials: []
    },
    {
        name: "Benjamin Thorpe",
        role: "Software Engineer",
        category: "Development",
        image: "/images/team/benjamin.webp",
        socials: []
    },
]

const categories = [
    { id: "All", label: "All", icon: Grid },
    { id: "Management", label: "Management", icon: Users },
    { id: "Design", label: "Design", icon: Layers },
    { id: "Development", label: "Development", icon: Code },
]

export function TeamSection() {
    const [activeCategory, setActiveCategory] = useState("All")
    const [hoveredMember, setHoveredMember] = useState<string | null>(null)

    const filteredTeam = activeCategory === "All"
        ? team
        : team.filter(member => member.category === activeCategory)

    return (
        <section className="relative w-full h-screen max-h-screen py-4 md:py-8 bg-background text-foreground overflow-hidden flex flex-col">
            <div className="container mx-auto px-4 md:px-6 h-full flex flex-col">


                {/* System Status */}
                <div className="flex-none mb-6">
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>System Online</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-8 lg:gap-12 min-h-0">

                    {/* Sidebar / Navigation */}
                    <div className="flex-none lg:w-64 space-y-8">
                        <div>
                            <h2 className="text-xl font-medium mb-6">Personnel Directory</h2>
                            <nav className="flex flex-col gap-1 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-none">

                                {team.map((member) => (
                                    <div
                                        key={member.name}
                                        onMouseEnter={() => setHoveredMember(member.name)}
                                        onMouseLeave={() => setHoveredMember(null)}
                                        className={cn(
                                            "flex flex-col px-4 py-3 text-sm transition-all duration-300 border-l-2 text-left group cursor-default",
                                            hoveredMember === member.name
                                                ? "border-primary bg-muted/40 text-foreground font-medium"
                                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                        )}
                                    >
                                        <span>{member.name}</span>
                                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-normal mt-0.5 group-hover:text-muted-foreground transition-colors">
                                            {member.role}
                                        </span>
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-2">
                        <motion.div
                            layout
                            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-8"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredTeam.map((member, index) => {
                                    const isHovered = hoveredMember === member.name
                                    const isDimmed = hoveredMember !== null && !isHovered

                                    return (
                                        <motion.div
                                            layout
                                            key={member.name}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.3 }}
                                            onMouseEnter={() => setHoveredMember(member.name)}
                                            onMouseLeave={() => setHoveredMember(null)}
                                            className={cn(
                                                "group relative border border-border/40 bg-card/30 overflow-hidden rounded-lg transition-all duration-500",
                                                isDimmed ? "opacity-30 scale-95 grayscale" : "opacity-100 scale-100",
                                                isHovered ? "ring-1 ring-primary/50 shadow-lg scale-[1.02] z-10" : ""
                                            )}
                                        >
                                            <div className="flex flex-col h-full">
                                                {/* Image & Overlay Section */}
                                                <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                                                    {member.image ? (
                                                        <Image
                                                            src={member.image}
                                                            alt={member.name}
                                                            fill
                                                            className={cn(
                                                                "object-cover transition-all duration-500",
                                                                isHovered ? "grayscale-0 scale-105" : "grayscale group-hover:grayscale-0 group-hover:scale-105"
                                                            )}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                                                            No Image
                                                        </div>
                                                    )}

                                                    {/* Text Overlay */}
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: isHovered ? 1 : 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                                                    >
                                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                                            {member.name}
                                                        </h3>
                                                        <p className="text-sm text-white/70 mt-1 font-mono uppercase tracking-wide">
                                                            {member.role}
                                                        </p>
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

