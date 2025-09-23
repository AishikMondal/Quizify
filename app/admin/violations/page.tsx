import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle, Shield } from "lucide-react"
import Link from "next/link"

export default async function AdminViolationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user data and verify admin role
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!userData || userData.role !== "admin") {
    redirect("/unauthorized")
  }

  // Get all violations with related data
  const { data: violations } = await supabase
    .from("cheating_logs")
    .select(`
      *,
      quiz_attempts(
        id,
        attempt_number,
        is_flagged,
        quizzes(title),
        users(full_name, email)
      )
    `)
    .order("timestamp", { ascending: false })

  // Group violations by incident type
  const violationsByType = violations?.reduce(
    (acc, violation) => {
      const type = violation.incident_type
      if (!acc[type]) acc[type] = 0
      acc[type]++
      return acc
    },
    {} as Record<string, number>,
  )

  const getViolationColor = (type: string) => {
    switch (type) {
      case "tab_switch":
      case "window_blur":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "copy_paste":
      case "right_click":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "fullscreen_exit":
      case "webcam_lost":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getViolationSeverity = (type: string) => {
    switch (type) {
      case "tab_switch":
      case "window_blur":
        return "Medium"
      case "copy_paste":
      case "right_click":
        return "High"
      case "fullscreen_exit":
      case "webcam_lost":
        return "Critical"
      default:
        return "Low"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Violations</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Violation Summary */}
        {violationsByType && Object.keys(violationsByType).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Violation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(violationsByType).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold text-red-600">{count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">{type.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Violations List */}
        {violations && violations.length > 0 ? (
          <div className="space-y-4">
            {violations.map((violation) => (
              <Card key={violation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="font-medium text-lg capitalize">{violation.incident_type.replace("_", " ")}</h3>
                        <Badge className={getViolationColor(violation.incident_type)}>
                          {getViolationSeverity(violation.incident_type)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Student:</span>
                          <div className="font-medium">
                            {violation.quiz_attempts?.users?.full_name ||
                              violation.quiz_attempts?.users?.email ||
                              "Unknown"}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Quiz:</span>
                          <div className="font-medium">{violation.quiz_attempts?.quizzes?.title || "Unknown Quiz"}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Attempt:</span>
                          <div className="font-medium">#{violation.quiz_attempts?.attempt_number || "N/A"}</div>
                        </div>
                      </div>

                      {violation.incident_data && Object.keys(violation.incident_data).length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-300">Additional Data:</span>
                            <pre className="mt-1 text-xs text-gray-800 dark:text-gray-200">
                              {JSON.stringify(violation.incident_data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(violation.timestamp).toLocaleString()}
                      </div>
                      {violation.quiz_attempts?.is_flagged && (
                        <Badge variant="destructive" className="mt-2">
                          Flagged
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No violations found</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Great! No security violations have been detected in the system.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
