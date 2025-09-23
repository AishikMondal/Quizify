"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Monitor, Camera, AlertTriangle, CheckCircle } from "lucide-react"
import { useAntiCheating } from "./anti-cheating-provider"
import type { Quiz } from "@/lib/types"

interface SecurityStatusProps {
  quiz: Quiz
  onRequestFullscreen?: () => void
}

export function SecurityStatus({ quiz, onRequestFullscreen }: SecurityStatusProps) {
  const { isFullscreen, webcamStream, violations } = useAntiCheating()

  if (!quiz.anti_cheating_enabled) {
    return null
  }

  const securityChecks = [
    {
      name: "Fullscreen Mode",
      required: quiz.fullscreen_required,
      active: isFullscreen,
      icon: Monitor,
      action: onRequestFullscreen,
    },
    {
      name: "Webcam Monitoring",
      required: quiz.webcam_required,
      active: !!webcamStream,
      icon: Camera,
    },
    {
      name: "Tab Switching",
      required: !quiz.tab_switching_allowed,
      active: !quiz.tab_switching_allowed,
      icon: Shield,
      description: quiz.tab_switching_allowed ? "Allowed" : "Blocked",
    },
    {
      name: "Copy/Paste",
      required: !quiz.copy_paste_allowed,
      active: !quiz.copy_paste_allowed,
      icon: Shield,
      description: quiz.copy_paste_allowed ? "Allowed" : "Blocked",
    },
    {
      name: "Right Click",
      required: !quiz.right_click_allowed,
      active: !quiz.right_click_allowed,
      icon: Shield,
      description: quiz.right_click_allowed ? "Allowed" : "Blocked",
    },
  ]

  const activeChecks = securityChecks.filter((check) => check.required)
  const passedChecks = activeChecks.filter((check) => check.active)
  const failedChecks = activeChecks.filter((check) => !check.active)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          Security Status
          <Badge variant={failedChecks.length === 0 ? "default" : "destructive"} className="ml-auto">
            {passedChecks.length}/{activeChecks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeChecks.map((check) => {
          const Icon = check.icon
          const isActive = check.active
          const isRequired = check.required

          return (
            <div key={check.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? "text-green-600" : "text-red-600"}`} />
                <div>
                  <span className="font-medium">{check.name}</span>
                  {check.description && <span className="text-sm text-gray-600 ml-2">({check.description})</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    {check.action && (
                      <Button variant="outline" size="sm" onClick={check.action} className="bg-transparent">
                        Enable
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {violations.length > 0 && (
          <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">Security Violations Detected</span>
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              {violations.length} violation(s) have been logged during this session.
            </div>
          </div>
        )}

        {failedChecks.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800 dark:text-amber-200">Security Requirements Not Met</span>
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Please enable all required security features before continuing with the quiz.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
