import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Clock, BookOpen } from "lucide-react"
import Link from "next/link"

export default async function StudentQuizzesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user data and verify student role
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!userData || userData.role !== "student") {
    redirect("/unauthorized")
  }

  // Get all published quizzes
  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(id)
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  // Get student's attempts
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, attempt_number, completed_at, score")
    .eq("student_id", user.id)

  // Group attempts by quiz
  const attemptsByQuiz = new Map()
  attempts?.forEach((attempt) => {
    if (!attemptsByQuiz.has(attempt.quiz_id)) {
      attemptsByQuiz.set(attempt.quiz_id, [])
    }
    attemptsByQuiz.get(attempt.quiz_id).push(attempt)
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Available Quizzes</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {allQuizzes && allQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allQuizzes.map((quiz) => {
              const userAttempts = attemptsByQuiz.get(quiz.id) || []
              const canTakeQuiz = userAttempts.length < quiz.max_attempts
              const bestScore = userAttempts
                .filter((a) => a.completed_at && a.score !== null)
                .reduce((max, a) => Math.max(max, a.score || 0), 0)

              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                      <Badge variant={canTakeQuiz ? "default" : "secondary"}>
                        {canTakeQuiz ? "Available" : "Completed"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {quiz.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Quiz Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span>{quiz.questions?.length || 0} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{quiz.time_limit ? `${quiz.time_limit}m` : "No limit"}</span>
                        </div>
                      </div>

                      {/* Attempt Info */}
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Attempts:</span>
                          <span>
                            {userAttempts.length} / {quiz.max_attempts}
                          </span>
                        </div>
                        {bestScore > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Best Score:</span>
                            <span className="font-medium">{Math.round(bestScore)}%</span>
                          </div>
                        )}
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
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="pt-2">
                        {canTakeQuiz ? (
                          <Link href={`/student/quiz/${quiz.id}`} className="w-full">
                            <Button className="w-full">
                              <Play className="h-4 w-4 mr-2" />
                              {userAttempts.length > 0 ? "Retake Quiz" : "Start Quiz"}
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled className="w-full">
                            All Attempts Used
                          </Button>
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
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quizzes available</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  There are no published quizzes available at the moment. Check back later!
                </p>
                <Link href="/student/dashboard">
                  <Button variant="outline" className="bg-transparent">
                    Back to Dashboard
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
