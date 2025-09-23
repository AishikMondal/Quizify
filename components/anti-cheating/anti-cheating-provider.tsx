"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Quiz } from "@/lib/types"

interface AntiCheatingContextType {
  isFullscreen: boolean
  webcamStream: MediaStream | null
  violations: string[]
  requestFullscreen: () => Promise<void>
  startWebcam: () => Promise<void>
  stopWebcam: () => void
  logViolation: (type: string, data?: any) => void
}

const AntiCheatingContext = createContext<AntiCheatingContextType | null>(null)

interface AntiCheatingProviderProps {
  children: React.ReactNode
  quiz: Quiz
  attemptId: string
  enabled?: boolean
}

export function AntiCheatingProvider({ children, quiz, attemptId, enabled = true }: AntiCheatingProviderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const [violations, setViolations] = useState<string[]>([])
  const [isTabActive, setIsTabActive] = useState(true)

  const logViolation = useCallback(
    async (type: string, data?: any) => {
      if (!enabled || !quiz.anti_cheating_enabled) return

      const violation = `${new Date().toISOString()}: ${type}`
      setViolations((prev) => [...prev, violation])

      // Log to database
      try {
        const supabase = createClient()
        await supabase.from("cheating_logs").insert({
          attempt_id: attemptId,
          incident_type: type as any,
          incident_data: data || {},
        })
      } catch (error) {
        console.error("Failed to log violation:", error)
      }
    },
    [enabled, quiz.anti_cheating_enabled, attemptId],
  )

  // Fullscreen monitoring
  useEffect(() => {
    if (!enabled || !quiz.anti_cheating_enabled || !quiz.fullscreen_required) return

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)

      if (!isCurrentlyFullscreen && document.fullscreenElement !== null) {
        logViolation("fullscreen_exit")
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [enabled, quiz.anti_cheating_enabled, quiz.fullscreen_required, logViolation])

  // Tab switching detection
  useEffect(() => {
    if (!enabled || !quiz.anti_cheating_enabled || quiz.tab_switching_allowed) return

    const handleVisibilityChange = () => {
      const isActive = !document.hidden
      setIsTabActive(isActive)

      if (!isActive) {
        logViolation("tab_switch")
      }
    }

    const handleWindowBlur = () => {
      logViolation("window_blur")
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleWindowBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [enabled, quiz.anti_cheating_enabled, quiz.tab_switching_allowed, logViolation])

  // Copy/paste prevention
  useEffect(() => {
    if (!enabled || !quiz.anti_cheating_enabled || quiz.copy_paste_allowed) return

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      logViolation("copy_paste", { action: "copy" })
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      logViolation("copy_paste", { action: "paste" })
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      logViolation("copy_paste", { action: "cut" })
    }

    document.addEventListener("copy", handleCopy)
    document.addEventListener("paste", handlePaste)
    document.addEventListener("cut", handleCut)

    return () => {
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("paste", handlePaste)
      document.removeEventListener("cut", handleCut)
    }
  }, [enabled, quiz.anti_cheating_enabled, quiz.copy_paste_allowed, logViolation])

  // Right-click prevention
  useEffect(() => {
    if (!enabled || !quiz.anti_cheating_enabled || quiz.right_click_allowed) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      logViolation("right_click")
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => document.removeEventListener("contextmenu", handleContextMenu)
  }, [enabled, quiz.anti_cheating_enabled, quiz.right_click_allowed, logViolation])

  // Keyboard shortcuts prevention
  useEffect(() => {
    if (!enabled || !quiz.anti_cheating_enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "v" || e.key === "x" || e.key === "a" || e.key === "s" || e.key === "p")
      ) {
        if (!quiz.copy_paste_allowed && (e.key === "c" || e.key === "v" || e.key === "x")) {
          e.preventDefault()
          logViolation("copy_paste", { key: e.key })
        }
      }

      // Prevent F12, Ctrl+Shift+I, etc.
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault()
        logViolation("dev_tools_attempt")
      }

      // Prevent Alt+Tab
      if (e.altKey && e.key === "Tab") {
        e.preventDefault()
        logViolation("alt_tab")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, quiz.anti_cheating_enabled, quiz.copy_paste_allowed, logViolation])

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch (error) {
      console.error("Failed to enter fullscreen:", error)
      logViolation("fullscreen_failed")
    }
  }, [logViolation])

  const startWebcam = useCallback(async () => {
    if (!enabled || !quiz.webcam_required) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      })
      setWebcamStream(stream)
    } catch (error) {
      console.error("Failed to start webcam:", error)
      logViolation("webcam_failed")
      throw error
    }
  }, [enabled, quiz.webcam_required, logViolation])

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop())
      setWebcamStream(null)
    }
  }, [webcamStream])

  // Monitor webcam stream
  useEffect(() => {
    if (!webcamStream || !enabled || !quiz.webcam_required) return

    const checkWebcamStatus = () => {
      const videoTracks = webcamStream.getVideoTracks()
      if (videoTracks.length === 0 || !videoTracks[0].enabled) {
        logViolation("webcam_lost")
      }
    }

    const interval = setInterval(checkWebcamStatus, 5000)
    return () => clearInterval(interval)
  }, [webcamStream, enabled, quiz.webcam_required, logViolation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error)
      }
    }
  }, [stopWebcam])

  const value: AntiCheatingContextType = {
    isFullscreen,
    webcamStream,
    violations,
    requestFullscreen,
    startWebcam,
    stopWebcam,
    logViolation,
  }

  return <AntiCheatingContext.Provider value={value}>{children}</AntiCheatingContext.Provider>
}

export function useAntiCheating() {
  const context = useContext(AntiCheatingContext)
  if (!context) {
    throw new Error("useAntiCheating must be used within AntiCheatingProvider")
  }
  return context
}
