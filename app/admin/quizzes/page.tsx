import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Users, Shield, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default async function AdminQuizzesPage() {
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

  // Get all quizzes with related data
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      users!quizzes_teacher_id_fkey(full_name, email),
      questions(id),
      quiz_attempts(id, completed_at, score, is_flagged),
      cheating_logs(id)
    `)
    .order("created_at", { ascending: false })

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Management</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {quizzes && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const totalAttempts = quiz.quiz_attempts?.length || 0
              const completedAttempts = quiz.quiz_attempts?.filter((a) => a.completed_at).length || 0
              const flaggedAttempts = quiz.quiz_attempts?.filter((a) => a.is_flagged).length || 0
              const violationCount = quiz.cheating_logs?.length || 0
              const avgScore =
                completedAttempts > 0
                  ? Math.round(
                      quiz.quiz_attempts
                        .filter((a) => a.completed_at && a.score !== null)
                        .reduce((acc, a) => acc + (a.score || 0), 0) / completedAttempts,
                    )
                  : 0

              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                      <div className="flex flex-col gap-1">
                        <Badge variant={quiz.is_published ? "default" : "secondary"}>
                          {quiz.is_published ? "Published" : "Draft"}
                        </Badge>
                        {quiz.anti_cheating_enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Secured
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {quiz.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>Created by {quiz.users?.full_name || quiz.users?.email || "Unknown"}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Questions:</span>
                        <span className="ml-1 font-medium">{quiz.questions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Time Limit:</span>
                        <span className="ml-1 font-medium">{quiz.time_limit ? `${quiz.time_limit}m` : "None"}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Attempts:</span>
                        <span className="ml-1 font-medium">{totalAttempts}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Avg Score:</span>
                        <span className="ml-1 font-medium">{avgScore}%</span>
                      </div>
                    </div>

                    {/* Security Features */}
                    {quiz.anti_cheating_enabled && (
                      <div className="pt-2 border-t">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {quiz.webcam_required && (
                            <Badge variant="outline" className="text-xs">
                              Webcam
                            </Badge>
                          )}
                          {quiz.fullscreen_required && (
                            <Badge variant="outline" className="text-xs">
                              Fullscreen
                            </Badge>
                          )}
                          {!quiz.tab_switching_allowed && (
                            <Badge variant="outline" className="text-xs">
                              No Tab Switch
                            </Badge>
                          )}
                          {!quiz.copy_paste_allowed && (
                            <Badge variant="outline" className="text-xs">
                              No Copy/Paste
                            </Badge>
                          )}
                        </div>

                        {(flaggedAttempts > 0 || violationCount > 0) && (
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {violationCount} violation{violationCount !== 1 ? "s" : ""}, {flaggedAttempts} flagged
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quizzes found</h3>
              <p className="text-gray-600 dark:text-gray-300">No quizzes have been created yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
