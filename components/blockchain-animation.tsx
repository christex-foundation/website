"use client"

import { useEffect, useRef, useState } from "react"
import { animate } from "animejs"

interface Transaction {
  id: string
  x: number
  y: number
}

interface Block {
  id: number
  x: number
  validated: boolean
}

export function BlockchainAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 0, x: 0, validated: true },
    { id: 1, x: 120, validated: true },
    { id: 2, x: 240, validated: true },
  ])
  const [pendingBlock, setPendingBlock] = useState<{ transactions: string[]; validating: boolean }>({
    transactions: [],
    validating: false,
  })
  const transactionIdRef = useRef(0)

  useEffect(() => {
    const generateTransaction = () => {
      const id = `tx-${transactionIdRef.current++}`
      const newTx: Transaction = {
        id,
        x: Math.random() * 200 - 100,
        y: -50,
      }

      setTransactions((prev) => [...prev.slice(-8), newTx])

      setTimeout(() => {
        const txEl = document.getElementById(id)
        if (txEl) {
          animate(txEl, {
            translateY: [0, 180],
            translateX: [0, -newTx.x],
            scale: [1, 0.6],
            opacity: [1, 0],
            duration: 2000,
            ease: "inOutQuad",
            onComplete: () => {
              setPendingBlock((prev) => ({
                ...prev,
                transactions: [...prev.transactions.slice(-3), id],
              }))
              setTransactions((prev) => prev.filter((t) => t.id !== id))
            },
          })
        }
      }, 50)
    }

    const interval = setInterval(generateTransaction, 800)
    return () => clearInterval(interval)
  }, [])

  // Handle block validation when enough transactions accumulate
  useEffect(() => {
    if (pendingBlock.transactions.length >= 4 && !pendingBlock.validating) {
      setPendingBlock((prev) => ({ ...prev, validating: true }))

      const pendingEl = document.getElementById("pending-block")
      if (pendingEl) {
        animate(pendingEl, {
          scale: [1, 1.1, 1],
          borderColor: ["rgba(255,255,255,0.2)", "rgba(0,255,136,0.8)", "rgba(0,255,136,0.4)"],
          duration: 1500,
          ease: "inOutQuad",
          onComplete: () => {
            setBlocks((prev) => [...prev.slice(-4), { id: prev.length, x: prev.length * 120, validated: true }])
            setPendingBlock({ transactions: [], validating: false })

            animate(".chain-link", {
              scaleX: [0, 1],
              duration: 400,
              ease: "outQuad",
            })
          },
        })
      }
    }
  }, [pendingBlock.transactions.length, pendingBlock.validating])

  useEffect(() => {
    animate(".validated-block", {
      boxShadow: ["0 0 0px rgba(0,255,136,0)", "0 0 20px rgba(0,255,136,0.3)", "0 0 0px rgba(0,255,136,0)"],
      duration: 3000,
      loop: true,
      ease: "inOutSine",
    })
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Transaction Generation Zone */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20">
        <div className="font-mono text-[10px] text-muted-foreground/50 text-center mb-2 tracking-widest">
          INCOMING TRANSACTIONS
        </div>
        <div className="relative h-16">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              id={tx.id}
              className="absolute left-1/2 top-0 w-3 h-3 bg-foreground/80 rounded-sm"
              style={{ transform: `translateX(${tx.x}px)` }}
            >
              <div className="absolute inset-0 bg-foreground/40 rounded-sm animate-ping" />
            </div>
          ))}
        </div>
      </div>

      {/* Pending Block */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          id="pending-block"
          className={`relative w-24 h-24 border-2 rounded-lg flex items-center justify-center transition-colors duration-300 ${
            pendingBlock.validating ? "border-[#00ff88]/80 bg-[#00ff88]/5" : "border-border bg-secondary/30"
          }`}
        >
          {/* Transaction slots inside block */}
          <div className="grid grid-cols-2 gap-1.5 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm transition-all duration-300 ${
                  pendingBlock.transactions.length > i ? "bg-foreground scale-100" : "bg-border/30 scale-75"
                }`}
              />
            ))}
          </div>

          {/* Validation indicator */}
          {pendingBlock.validating && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <span className="font-mono text-[9px] text-[#00ff88] tracking-widest animate-pulse">VALIDATING</span>
            </div>
          )}

          {/* Block label */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted-foreground tracking-wider">
            BLOCK #{blocks.length}
          </div>
        </div>
      </div>

      {/* Blockchain Chain */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center">
        {blocks.slice(-5).map((block, index, arr) => (
          <div key={block.id} className="flex items-center">
            {/* Block */}
            <div
              className={`validated-block relative w-16 h-16 rounded border flex items-center justify-center ${
                block.validated ? "border-[#00ff88]/40 bg-[#00ff88]/5" : "border-border bg-secondary/20"
              }`}
            >
              <div className="grid grid-cols-2 gap-1 p-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-2 h-2 bg-foreground/60 rounded-sm" />
                ))}
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[8px] text-muted-foreground/60">
                #{block.id}
              </div>
            </div>

            {/* Chain link */}
            {index < arr.length - 1 && (
              <div className="chain-link w-8 h-0.5 bg-gradient-to-r from-[#00ff88]/40 to-[#00ff88]/20" />
            )}
          </div>
        ))}
      </div>

      {/* Data flow lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <line
          x1="50%"
          y1="80"
          x2="50%"
          y2="45%"
          stroke="url(#flowGradient)"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="animate-pulse"
        />
      </svg>
    </div>
  )
}
