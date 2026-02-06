"use client"

import { useEffect, useRef, useState } from "react"
import { animate, stagger } from "animejs"
import { motion, useScroll, useTransform } from "framer-motion"

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

interface Block {
  id: number
  hash: string
  transactions: number
  timestamp: string
}

function generateBlock(id: number): Block {
  const hexChars = "0123456789abcdef"
  const randomHex = (len: number) =>
    Array(len)
      .fill(0)
      .map(() => hexChars[Math.floor(Math.random() * 16)])
      .join("")
  const now = new Date()
  return {
    id,
    hash: `0x${randomHex(4)}...${randomHex(4)}`,
    transactions: Math.floor(Math.random() * 150) + 100,
    timestamp: now.toTimeString().slice(0, 8),
  }
}

export function BlockchainParallax() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [blocks, setBlocks] = useState<Block[]>(() => [generateBlock(1), generateBlock(2), generateBlock(3)])
  const [pendingBlock, setPendingBlock] = useState<Block | null>(null)
  const [validationPhase, setValidationPhase] = useState<"idle" | "collecting" | "validating" | "confirmed">("idle")
  const [isAddingBlock, setIsAddingBlock] = useState(false)
  const blockIdRef = useRef(4)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.8])

  useEffect(() => {
    if (validationPhase === "collecting" && !pendingBlock) {
      setPendingBlock(generateBlock(blockIdRef.current))
    }
  }, [validationPhase, pendingBlock])

  useEffect(() => {
    if (validationPhase === "confirmed" && pendingBlock && !isAddingBlock) {
      setIsAddingBlock(true)

      setTimeout(() => {
        setBlocks((prev) => [...prev, pendingBlock])
        setPendingBlock(null)
        blockIdRef.current++
        setIsAddingBlock(false)
      }, 800)
    }
  }, [validationPhase, pendingBlock, isAddingBlock])

  useEffect(() => {
    if (isMobile) {
      setValidationPhase("confirmed")
      return
    }

    const phases = ["idle", "collecting", "validating", "confirmed"] as const
    let phaseIndex = 0

    const cyclePhases = () => {
      phaseIndex = (phaseIndex + 1) % phases.length
      setValidationPhase(phases[phaseIndex])
    }

    const interval = setInterval(cyclePhases, 2500)
    return () => clearInterval(interval)
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return

    if (validationPhase === "collecting") {
      animate(".tx-particle", {
        translateY: [-20, 80],
        translateX: () => Math.random() * 60 - 30,
        opacity: [1, 0],
        scale: [1, 0.5],
        delay: stagger(100),
        duration: 1000,
        ease: "inQuad",
      })
    }
  }, [validationPhase, isMobile])

  useEffect(() => {
    if (isMobile) return

    if (validationPhase === "validating") {
      animate(".validation-ring", {
        scale: [1, 1.5],
        opacity: [0.5, 0],
        duration: 800,
        loop: 2,
        ease: "outQuad",
      })
    }
  }, [validationPhase, isMobile])

  const displayedBlock = pendingBlock || blocks[blocks.length - 1]
  const chainBlocks = blocks.slice(-5)
  const totalBlocks = blocks.length

  return (
    <motion.div
      ref={containerRef}
      style={isMobile ? {} : { opacity, scale }}
      className="relative py-32 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Real-Time Consensus
          </span>
          <h2 className="text-3xl md:text-4xl font-light mt-4 text-balance">Distributed ledger in motion</h2>
        </div>

        {/* Main Visualization */}
        <div className="relative h-[400px] lg:h-[400px] flex items-center justify-center">
          {/* Transaction Particles - hidden on mobile */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 hidden lg:block">
            {!isMobile && validationPhase === "collecting" && (
              <>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="tx-particle absolute left-1/2 top-0 w-2 h-2 bg-foreground rounded-full"
                    style={{ marginLeft: `${(i - 2.5) * 12}px` }}
                  />
                ))}
              </>
            )}
            <div className="font-mono text-[9px] text-muted-foreground/50 text-center mt-2 tracking-widest">
              {validationPhase === "collecting" && "COLLECTING TRANSACTIONS"}
              {validationPhase === "validating" && "CONSENSUS IN PROGRESS"}
              {validationPhase === "confirmed" && "BLOCK CONFIRMED"}
              {validationPhase === "idle" && "AWAITING TRANSACTIONS"}
            </div>
          </div>

          {/* Central Active Block */}
          <div className="relative">
            {/* Validation rings - hidden on mobile */}
            {!isMobile && validationPhase === "validating" && (
              <>
                <div className="validation-ring absolute inset-0 border-2 border-[#00ff88] rounded-xl" />
                <div
                  className="validation-ring absolute inset-0 border-2 border-[#00ff88] rounded-xl"
                  style={{ animationDelay: "0.4s" }}
                />
              </>
            )}

            <div
              className={`relative w-40 h-48 rounded-xl border-2 transition-all duration-500 ${
                isMobile || validationPhase === "confirmed"
                  ? "border-[#00ff88] bg-[#00ff88]/10"
                  : validationPhase === "validating"
                    ? "border-foreground/60 bg-foreground/5"
                    : "border-border bg-secondary/20"
              }`}
            >
              {/* Block content */}
              <div className="p-4 h-full flex flex-col">
                <div className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">BLOCK</div>
                <div className="font-mono text-lg text-foreground mt-1">
                  #{displayedBlock.id.toString().padStart(6, "0")}
                </div>

                <div className="mt-4 space-y-2 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] text-muted-foreground/50">HASH</span>
                    <span className="font-mono text-[10px] text-foreground/80">{displayedBlock.hash}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] text-muted-foreground/50">TX</span>
                    <span className="font-mono text-[10px] text-foreground/80">{displayedBlock.transactions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] text-muted-foreground/50">TIME</span>
                    <span className="font-mono text-[10px] text-foreground/80">{displayedBlock.timestamp}</span>
                  </div>
                </div>

                {/* Transaction grid visualization */}
                <div className="grid grid-cols-4 gap-1 mt-auto">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-sm transition-all duration-300 ${
                        isMobile || validationPhase === "validating" || validationPhase === "confirmed"
                          ? "bg-foreground/60"
                          : validationPhase === "collecting" && i < 4
                            ? "bg-foreground/60"
                            : "bg-border/30"
                      }`}
                      style={{
                        transitionDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Status indicator */}
              <div
                className={`absolute -top-3 right-4 px-2 py-0.5 rounded text-[8px] font-mono tracking-wider ${
                  isMobile || validationPhase === "confirmed"
                    ? "bg-[#00ff88] text-background"
                    : validationPhase === "validating"
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {isMobile ? (
                  "CONFIRMED"
                ) : (
                  <>
                    {validationPhase === "confirmed" && "CONFIRMED"}
                    {validationPhase === "validating" && "VALIDATING"}
                    {validationPhase === "collecting" && "PENDING"}
                    {validationPhase === "idle" && "WAITING"}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chain - hidden on mobile, simplified */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 items-center hidden lg:flex">
            <motion.div
              className="w-8 h-px bg-gradient-to-r from-foreground/20 to-[#00ff88]/50"
              animate={!isMobile && validationPhase === "confirmed" ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }}
              transition={{ duration: 0.5 }}
            />

            <div className="flex items-center gap-1 overflow-hidden">
              {chainBlocks.map((block, i) => (
                <motion.div
                  key={block.id}
                  className="flex items-center"
                  initial={{ opacity: 0, x: 40, scale: 0.8 }}
                  animate={{ opacity: 0.6, x: 0, scale: 1 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                >
                  <div
                    className={`w-12 h-14 rounded border flex items-center justify-center transition-all duration-500 ${
                      block.id === blocks[blocks.length - 1]?.id && validationPhase === "confirmed"
                        ? "border-[#00ff88]/80 bg-[#00ff88]/20"
                        : "border-[#00ff88]/30 bg-[#00ff88]/5"
                    }`}
                  >
                    <span className="font-mono text-[8px] text-foreground/60">#{block.id}</span>
                  </div>
                  {i < chainBlocks.length - 1 && <div className="w-3 h-px bg-[#00ff88]/30" />}
                </motion.div>
              ))}
            </div>

            {totalBlocks > 5 && (
              <motion.div
                className="font-mono text-[8px] text-muted-foreground/40 ml-3 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-4 h-px bg-gradient-to-r from-[#00ff88]/20 to-transparent" />+{totalBlocks - 5} more
              </motion.div>
            )}
          </div>

          {/* Left side - hidden on mobile */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 items-center gap-2 opacity-20 hidden lg:flex">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-border" />
            <div className="w-10 h-12 rounded border border-dashed border-border/50 flex items-center justify-center">
              <span className="font-mono text-[8px] text-muted-foreground/30">?</span>
            </div>
          </div>
        </div>

        {/* Stats - simplified layout on mobile */}
        <div className="mt-16 grid grid-cols-3 gap-4 lg:gap-8 max-w-2xl mx-auto">
          {[
            { label: "Block Time", value: "~10s" },
            { label: "Blocks Added", value: totalBlocks.toString() },
            { label: "Finality", value: "99.9%" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-mono text-xl lg:text-2xl text-foreground">{stat.value}</div>
              <div className="font-mono text-[9px] lg:text-[10px] text-muted-foreground/60 tracking-wider mt-1 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
