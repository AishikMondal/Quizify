"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield } from "lucide-react"
import { AntiCheatingProvider, useAntiCheating } from "./anti-cheating-provider"
import { WebcamMonitor } from "./webcam-monitor"
import { SecurityStatus } from "./security-status"
import type { Quiz } from "@/lib/types"

interface QuizSecurityWrapperProps {
  children: React.ReactNode
  quiz: Quiz
  attemptId: string
  onSecurityReady?: () => void
}

function SecuritySetup({ quiz, onReady }: { quiz: Quiz; onReady: () => void }) {
  const { isFullscreen, webcamStream, requestFullscreen, startWebcam } = useAntiCheating()
  const [webcamReady, setWebcamReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const isReady = () => {
    if (quiz.fullscreen_required && !isFullscreen) return false
    if (quiz.webcam_required && !webcamStream) return false
    return true
  }

  const handleStart = async () => {
    setIsStarting(true)
    try {
      if (quiz.fullscreen_required && !isFullscreen) {
        await requestFullscreen()
      }
      if (quiz.webcam_required && !webcamStream) {
        await startWebcam()
      }
      if (isReady()) {
        onReady()
      }
    } catch (error) {
      console.error("Failed to setup security:", error)
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    if (isReady()) {
      onReady()
    }
  }, [isFullscreen, webcamStream, onReady])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Shield className="h-6 w-6" />
              Security Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-gray-600 dark:text-gray-300">
              This quiz requires additional security measures to ensure academic integrity. Please complete the setup
              below to continue.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SecurityStatus quiz={quiz} onRequestFullscreen={requestFullscreen} />
              {quiz.webcam_required && <WebcamMonitor required onStatusChange={setWebcamReady} />}
            </div>

            {!isReady() && (
              <div className="text-center">
                <Button onClick={handleStart} disabled={isStarting} size="lg">
                  {isStarting ? "Setting up..." : "Complete Security Setup"}
                </Button>
              </div>
            )}

            {isReady() && (
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-green-800 dark:text-green-200 font-medium mb-2">Security Setup Complete!</div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  All security requirements have been met. You can now proceed with the quiz.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {quiz.anti_cheating_enabled && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">Important Notice</div>
                  <div className="text-amber-700 dark:text-amber-300 space-y-1">
                    <p>• Your activity will be monitored throughout the quiz</p>
                    <p>• Any suspicious behavior will be logged and reported</p>
                    <p>• Violations may result in quiz termination</p>
                    <p>• Ensure you're in a quiet, private environment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function QuizSecurityWrapper({ children, quiz, attemptId, onSecurityReady }: QuizSecurityWrapperProps) {
  const [securityReady, setSecurityReady] = useState(false)

  const handleSecurityReady = () => {
    setSecurityReady(true)
    onSecurityReady?.()
  }

  if (!quiz.anti_cheating_enabled) {
    return <>{children}</>
  }

  return (
    <AntiCheatingProvider quiz={quiz} attemptId={attemptId}>
      {!securityReady ? (
        <SecuritySetup quiz={quiz} onReady={handleSecurityReady} />
      ) : (
        <div className="relative">
          {children}
          {/* Floating security status */}
          <div className="fixed bottom-4 right-4 z-50">
            <SecurityStatus quiz={quiz} />
          </div>
          {quiz.webcam_required && (
            <div className="fixed bottom-4 left-4 z-50">
              <WebcamMonitor required />
            </div>
          )}
        </div>
      )}
    </AntiCheatingProvider>
  )
}
