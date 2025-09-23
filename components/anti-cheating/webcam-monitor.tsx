"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, CameraOff, AlertTriangle } from "lucide-react"
import { useAntiCheating } from "./anti-cheating-provider"

interface WebcamMonitorProps {
  required?: boolean
  onStatusChange?: (isActive: boolean) => void
}

export function WebcamMonitor({ required = false, onStatusChange }: WebcamMonitorProps) {
  const { webcamStream, startWebcam, stopWebcam, logViolation } = useAntiCheating()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream
    }
  }, [webcamStream])

  useEffect(() => {
    onStatusChange?.(!!webcamStream)
  }, [webcamStream, onStatusChange])

  const handleStartWebcam = async () => {
    setIsStarting(true)
    setError(null)
    try {
      await startWebcam()
    } catch (error) {
      setError("Failed to access webcam. Please check your camera permissions.")
      logViolation("webcam_permission_denied")
    } finally {
      setIsStarting(false)
    }
  }

  const handleStopWebcam = () => {
    stopWebcam()
    setError(null)
  }

  if (!required && !webcamStream) {
    return null
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Webcam Monitor
            </h3>
            {required && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200">
                Required
              </span>
            )}
          </div>

          {webcamStream ? (
            <div className="space-y-3">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg object-cover"
                />
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Camera Active
                </span>
                <Button variant="ghost" size="sm" onClick={handleStopWebcam} className="h-6 px-2">
                  <CameraOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <CameraOff className="h-8 w-8 text-gray-400" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  {error}
                </div>
              )}
              <Button onClick={handleStartWebcam} disabled={isStarting} size="sm" className="w-full">
                {isStarting ? "Starting..." : "Start Camera"}
              </Button>
              {required && !webcamStream && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Camera access is required to take this quiz
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
