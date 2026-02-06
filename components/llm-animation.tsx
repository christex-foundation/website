"use client"

import { useEffect, useRef, useState } from "react"
import { animate, stagger } from "animejs"

interface Token {
  id: string
  text: string
  x: number
  y: number
}

interface AttentionLine {
  id: string
  fromToken: number
  toToken: number
  weight: number
}

interface EmbeddingParticle {
  id: string
  x: number
  y: number
  targetX: number
  targetY: number
}

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

export function LLMAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [tokens, setTokens] = useState<Token[]>([])
  const [attentionLines, setAttentionLines] = useState<AttentionLine[]>([])
  const [embeddingParticles, setEmbeddingParticles] = useState<EmbeddingParticle[]>([])
  const [outputTokens, setOutputTokens] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<"tokenize" | "embed" | "attention" | "generate">("tokenize")
  const animationRef = useRef<number | null>(null)

  const inputText = "How does artificial intelligence learn?"
  const outputText = ["It", "learns", "from", "data", "patterns", "..."]

  const tokenizedWords = inputText.split(" ")

  useEffect(() => {
    if (isMobile) {
      // Set static tokens for mobile
      const staticTokens: Token[] = tokenizedWords.map((word, i) => ({
        id: `token-${i}`,
        text: word,
        x: 80 + i * 120,
        y: 80,
      }))
      setTokens(staticTokens)
      setCurrentPhase("attention")
      return
    }

    let isCancelled = false

    const runAnimation = async () => {
      if (isCancelled) return

      // Clear all states at the start
      setTokens([])
      setAttentionLines([])
      setEmbeddingParticles([])
      setOutputTokens([])

      // Small delay to ensure state clears and DOM updates
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (isCancelled) return

      // Phase 1: Tokenization - words appear one by one
      setCurrentPhase("tokenize")
      const newTokens: Token[] = tokenizedWords.map((word, i) => ({
        id: `token-${i}`,
        text: word,
        x: 80 + i * 120,
        y: 80,
      }))

      for (let i = 0; i < newTokens.length; i++) {
        if (isCancelled) return
        await new Promise((resolve) => setTimeout(resolve, 150))
        setTokens((prev) => [...prev, newTokens[i]])
      }

      // Animate tokens appearing
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (isCancelled) return
      animate(".input-token", {
        opacity: [0, 1],
        translateY: [-20, 0],
        delay: stagger(100),
        duration: 400,
        ease: "outQuad",
      })

      await new Promise((resolve) => setTimeout(resolve, 800))
      if (isCancelled) return

      // Phase 2: Embedding - particles flow from tokens downward
      setCurrentPhase("embed")
      const particles: EmbeddingParticle[] = []
      tokenizedWords.forEach((_, tokenIndex) => {
        for (let p = 0; p < 8; p++) {
          particles.push({
            id: `particle-${tokenIndex}-${p}`,
            x: 80 + tokenIndex * 120 + Math.random() * 40 - 20,
            y: 120,
            targetX: 80 + tokenIndex * 120 + Math.random() * 60 - 30,
            targetY: 200 + Math.random() * 80,
          })
        }
      })
      setEmbeddingParticles(particles)

      await new Promise((resolve) => setTimeout(resolve, 100))
      if (isCancelled) return
      animate(".embedding-particle", {
        translateY: [0, 100],
        opacity: [0, 1, 1, 0],
        duration: 1500,
        delay: stagger(30),
        ease: "inOutSine",
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (isCancelled) return

      // Phase 3: Attention - lines connect tokens showing relationships
      setCurrentPhase("attention")
      const attentions: AttentionLine[] = []
      for (let i = 0; i < tokenizedWords.length; i++) {
        for (let j = 0; j < tokenizedWords.length; j++) {
          if (i !== j && Math.random() > 0.4) {
            attentions.push({
              id: `attention-${i}-${j}`,
              fromToken: i,
              toToken: j,
              weight: Math.random() * 0.8 + 0.2,
            })
          }
        }
      }
      setAttentionLines(attentions)

      await new Promise((resolve) => setTimeout(resolve, 100))
      if (isCancelled) return
      animate(".attention-line", {
        strokeDashoffset: [1000, 0],
        opacity: [0, 0.6],
        duration: 1200,
        delay: stagger(50),
        ease: "inOutQuad",
      })

      // Pulse the attention weights
      await new Promise((resolve) => setTimeout(resolve, 800))
      if (isCancelled) return
      animate(".attention-line", {
        opacity: [0.6, 0.2, 0.6],
        duration: 1000,
        loop: 2,
        ease: "inOutSine",
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (isCancelled) return

      // Phase 4: Generation - output tokens appear
      setCurrentPhase("generate")
      setAttentionLines([])

      for (let i = 0; i < outputText.length; i++) {
        if (isCancelled) return
        await new Promise((resolve) => setTimeout(resolve, 400))
        console.log('Adding token:', outputText[i], 'Index:', i)
        setOutputTokens((prev) => {
          const newTokens = [...prev, outputText[i]]
          console.log('OutputTokens array:', newTokens)
          return newTokens
        })
      }

      if (isCancelled) return
      animate(".output-token", {
        opacity: [0, 1],
        translateX: [-10, 0],
        delay: stagger(150),
        duration: 300,
        ease: "outQuad",
      })

      // Reset after full cycle
      await new Promise((resolve) => setTimeout(resolve, 3000))
      if (isCancelled) return

      // Loop the animation
      animationRef.current = window.setTimeout(() => runAnimation(), 500)
    }

    runAnimation()

    return () => {
      isCancelled = true
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [isMobile])

  if (isMobile) {
    return (
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        {/* Static background grid */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="llm-grid-mobile" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#llm-grid-mobile)" />
        </svg>

        {/* Static neural network representation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6 opacity-30">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-12 h-12 border border-border/50 rounded flex items-center justify-center">
                <div className="grid grid-cols-3 gap-0.5">
                  {[...Array(9)].map((_, j) => (
                    <div key={j} className="w-1 h-1 bg-muted-foreground/40 rounded-sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Static label */}
        <div className="absolute top-8 right-8 font-mono text-[9px] text-muted-foreground/30 text-right space-y-1">
          <div>MODEL: GPT-ARCH</div>
          <div>LAYERS: 12</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <pattern id="llm-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#llm-grid)" />
      </svg>

      {/* Neural network layers visualization */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Layer indicators */}
        {[1, 2, 3, 4].map((layer) => (
          <g key={layer} className="transformer-layer">
            <rect
              x={`${15 + layer * 18}%`}
              y="25%"
              width="12%"
              height="50%"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/20"
            />
            <text
              x={`${21 + layer * 18}%`}
              y="78%"
              textAnchor="middle"
              className="fill-muted-foreground/30 font-mono text-[8px]"
            >
              L{layer}
            </text>
          </g>
        ))}

        {/* Attention lines */}
        {attentionLines.map((line) => {
          const fromX = 100 + line.fromToken * 120
          const toX = 100 + line.toToken * 120
          const controlY = 180 + Math.abs(line.fromToken - line.toToken) * 30
          return (
            <path
              key={line.id}
              className="attention-line"
              d={`M ${fromX} 100 Q ${(fromX + toX) / 2} ${controlY} ${toX} 100`}
              fill="none"
              stroke="currentColor"
              strokeWidth={line.weight * 2}
              strokeDasharray="1000"
              strokeDashoffset="1000"
              opacity="0"
              style={{ color: `rgba(var(--accent), ${line.weight})` }}
            />
          )
        })}
      </svg>

      {/* Input section label */}
      <div className="absolute top-8 left-8 font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
        Input Sequence
      </div>

      {/* Input tokens */}
      <div className="absolute top-16 left-8 flex gap-2">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="input-token px-3 py-1.5 bg-secondary/50 border border-border/50 font-mono text-xs text-foreground/80"
            style={{ opacity: 0 }}
          >
            {token.text}
          </div>
        ))}
      </div>

      {/* Embedding particles */}
      {embeddingParticles.map((particle) => (
        <div
          key={particle.id}
          className="embedding-particle absolute w-1 h-1 bg-accent/60 rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: 0,
          }}
        />
      ))}

      {/* Processing indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          {/* Transformer visualization */}
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="transformer-node w-16 h-16 border border-border/30 rounded flex items-center justify-center"
                style={{
                  opacity: currentPhase === "embed" || currentPhase === "attention" ? 0.8 : 0.3,
                }}
              >
                <div className="grid grid-cols-3 gap-0.5">
                  {[...Array(9)].map((_, j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-sm"
                      style={{
                        opacity: currentPhase === "attention" ? 0.8 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Flow arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-16 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <svg key={i} className="w-4 h-4 text-muted-foreground/30" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            ))}
          </div>
        </div>

        {/* Phase indicator */}
        <div className="mt-8 text-center">
          <span className="font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase">
            {currentPhase === "tokenize" && "Tokenizing Input"}
            {currentPhase === "embed" && "Computing Embeddings"}
            {currentPhase === "attention" && "Self-Attention"}
            {currentPhase === "generate" && "Generating Output"}
          </span>
        </div>
      </div>

      {/* Attention matrix visualization */}
      {currentPhase === "attention" && (
        <div className="absolute bottom-32 right-8 opacity-60">
          <div className="font-mono text-[8px] text-muted-foreground/50 mb-2 tracking-widest uppercase">
            Attention Weights
          </div>
          <div className="grid grid-cols-6 gap-0.5">
            {[...Array(36)].map((_, i) => (
              <div
                key={i}
                className="attention-cell w-3 h-3 rounded-sm transition-all duration-300"
                style={{
                  backgroundColor: `rgba(var(--accent), ${Math.random() * 0.8})`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Output section */}
      <div className="absolute bottom-16 left-8">
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest uppercase mb-2">
          Generated Output
        </div>
        <div className="flex gap-2">
          {outputTokens.map((token, i) => (
            <div
              key={`output-${token}-${i}`}
              className="output-token px-3 py-1.5 bg-accent/10 border border-accent/30 font-mono text-xs text-accent"
              style={{ opacity: 0 }}
            >
              {token}
            </div>
          ))}
          {currentPhase === "generate" && <div className="w-2 h-6 bg-accent/50 animate-pulse" />}
        </div>
      </div>

      {/* Probability distribution */}
      {currentPhase === "generate" && (
        <div className="absolute bottom-32 left-8 opacity-60">
          <div className="font-mono text-[8px] text-muted-foreground/50 mb-2 tracking-widest uppercase">
            Token Probabilities
          </div>
          <div className="flex items-end gap-1 h-12">
            {["It", "The", "AI", "This", "We"].map((word, i) => (
              <div key={word} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 bg-accent/40 transition-all duration-300"
                  style={{ height: `${[40, 20, 15, 12, 8][i]}px` }}
                />
                <span className="font-mono text-[6px] text-muted-foreground/40">{word}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating data points */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-muted-foreground/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Technical readout */}
      <div className="absolute top-8 right-8 font-mono text-[9px] text-muted-foreground/40 text-right space-y-1">
        <div>MODEL: GPT-ARCH</div>
        <div>LAYERS: 12</div>
        <div>HEADS: 8</div>
        <div>DIM: 768</div>
      </div>
    </div>
  )
}
