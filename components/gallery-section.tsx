"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const defaultImages = [
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=800&auto=format&fit=crop",
]

function MarqueeRow({
    images,
    className,
    reverse = false,
    duration = "100s",
}: {
    images: string[]
    className?: string
    reverse?: boolean
    duration?: string
}) {
    return (
        <div
            className={cn("flex flex-row relative overflow-hidden w-full group pointer-events-auto marquee-container", className)}
        >
            <div
                className={cn(
                    "flex flex-row gap-4 pr-4 will-change-transform",
                    reverse ? "animate-marquee-right" : "animate-marquee-left"
                )}
                style={{ animationDuration: duration }}
            >
                {/* Quadruple the images to ensure seamless loop */}
                {[...images, ...images, ...images, ...images].map((src, i) => (
                    <div
                        key={i}
                        className="relative rounded-xl overflow-hidden shrink-0 aspect-[4/3] h-[200px] md:h-[280px] even:aspect-[3/4] group/item bg-muted"
                    >
                        <Image
                            src={src}
                            alt="Gallery image"
                            fill
                            className="object-cover filter grayscale transition-all duration-700 group-hover/item:grayscale-0 group-hover/item:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors duration-500" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function GallerySection({ images = defaultImages }: { images?: string[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(containerRef, { once: true, margin: "-100px" })

    // Use provided images effectively
    const displayImages = images.length > 0 ? images : defaultImages

    // Create 2 rows of data
    // If we have very few images, we might want to duplicate them more to fill the row
    const row1 = displayImages
    const row2 = [...displayImages.slice(Math.floor(displayImages.length / 2)), ...displayImages.slice(0, Math.floor(displayImages.length / 2))]

    return (
        <section ref={containerRef} className="py-24 bg-background border-t border-border overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-[1px] bg-primary"></div>
                            <span className="font-mono text-xs tracking-widest uppercase text-primary">Gallery</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-light text-foreground text-balance">
                            Moments of <br />
                            <span className="text-muted-foreground">impact & connection.</span>
                        </h2>
                    </div>
                    <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                        A glimpse into the vibrant ecosystem of innovators, creators, and changemakers shaping the future.
                    </p>
                </motion.div>

                {/* Gallery Window */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative overflow-hidden rounded-3xl bg-muted/5 border border-border/40 py-8"
                >

                    {/* Rows */}
                    <div className="flex flex-col gap-6 md:gap-8 overflow-hidden">
                        <MarqueeRow images={row1} duration="240s" />
                        <MarqueeRow images={row2} reverse duration="280s" />
                    </div>

                    {/* Side Fade */}
                    <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                </motion.div>

            </div>

            <style jsx global>{`
        @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
        }
        .animate-marquee-left {
            animation: marquee-left linear infinite;
        }
        .animate-marquee-right {
            animation: marquee-right linear infinite;
        }
        .marquee-container:hover .animate-marquee-left,
        .marquee-container:hover .animate-marquee-right {
            animation-play-state: paused !important;
        }
      `}</style>
        </section>
    )
}
