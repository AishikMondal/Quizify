import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, BarChart3, Eye } from "lucide-react"
import Link from "next/link"

export default async function QuizzesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user data and verify teacher role
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!userData || userData.role !== "teacher") {
    redirect("/unauthorized")
  }

  // Get all teacher's quizzes with attempt counts
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(id),
      quiz_attempts(id, completed_at, score)
    `)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/teacher/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Quizzes</h1>
            </div>
            <Link href="/teacher/quiz/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Quiz
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {quizzes && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const totalAttempts = quiz.quiz_attempts?.length || 0
              const completedAttempts = quiz.quiz_attempts?.filter((a) => a.completed_at).length || 0
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
                      <Badge variant={quiz.is_published ? "default" : "secondary"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {quiz.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Questions:</span>
                          <span className="ml-1 font-medium">{quiz.questions?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time Limit:</span>
                          <span className="ml-1 font-medium">{quiz.time_limit ? `${quiz.time_limit}m` : "None"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Attempts:</span>
                          <span className="ml-1 font-medium">{totalAttempts}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Avg Score:</span>
                          <span className="ml-1 font-medium">{avgScore}%</span>
                        </div>
                      </div>

                      {/* Security Features */}
                      {quiz.anti_cheating_enabled && (
                        <div className="flex flex-wrap gap-1">
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
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/teacher/quiz/${quiz.id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/teacher/quiz/${quiz.id}/results`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Results
                          </Button>
                        </Link>
                        {quiz.is_published && (
                          <Link href={`/quiz/${quiz.id}/preview`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full bg-transparent">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quizzes yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Get started by creating your first quiz. You can add questions, set time limits, and configure
                  anti-cheating features.
                </p>
                <Link href="/teacher/quiz/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
