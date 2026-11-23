"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SharePostButtonProps {
  title: string
  slug: string
  excerpt?: string
  size?: "default" | "sm" | "icon"
  variant?: "outline" | "ghost" | "secondary"
  className?: string
}

const SITE_FALLBACK = "https://christex.foundation"

export function buildPostUrl(slug: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : SITE_FALLBACK
  return `${origin}/blog/${encodeURIComponent(slug)}`
}

export function SharePostButton({
  title,
  slug,
  excerpt,
  size = "sm",
  variant = "outline",
  className,
}: SharePostButtonProps) {
  const [copied, setCopied] = useState(false)

  const getUrl = () => buildPostUrl(slug)

  const handleCopy = async () => {
    const url = getUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = url
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    toast.success("Article link copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const openShareWindow = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=520")
  }

  const handleNativeShare = async () => {
    const url = getUrl()
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: excerpt || title,
          url,
        })
      } catch {
        // User cancelled share sheet
      }
    }
  }

  const supportsNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={
            size === "icon"
              ? `h-8 w-8 p-0 ${className || ""}`
              : `gap-1.5 rounded-full ${className || ""}`
          }
          title="Share article"
          aria-label="Share article"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          {size !== "icon" && <span>{copied ? "Copied" : "Share"}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2">
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>Copy link</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            const url = getUrl()
            openShareWindow(
              `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`
            )
          }}
        >
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            const url = getUrl()
            openShareWindow(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=ChristexFndn`
            )
          }}
        >
          Share on X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            const url = getUrl()
            openShareWindow(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
            )
          }}
        >
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            const url = getUrl()
            openShareWindow(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
            )
          }}
        >
          Share on Facebook
        </DropdownMenuItem>
        {supportsNativeShare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer gap-2">
              <Share2 className="w-4 h-4" />
              <span>More apps…</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
