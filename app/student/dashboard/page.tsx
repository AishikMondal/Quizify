import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Trophy, TrendingUp, Play } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"

export default async function StudentDashboard() {
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

  // Get available quizzes (published)
  const { data: availableQuizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(id),
      quiz_attempts!inner(id, completed_at, score, attempt_number)
    `)
    .eq("is_published", true)
    .eq("quiz_attempts.student_id", user.id)

  // Get all published quizzes (for quizzes not yet attempted)
  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(id)
    `)
    .eq("is_published", true)

  // Get student's attempts
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select(`
      *,
      quizzes(title)
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })

  // Calculate stats
  const totalAttempts = attempts?.length || 0
  const completedAttempts = attempts?.filter((a) => a.completed_at).length || 0
  const avgScore =
    completedAttempts > 0
      ? Math.round(
          attempts.filter((a) => a.completed_at && a.score !== null).reduce((acc, a) => acc + (a.score || 0), 0) /
            completedAttempts,
        )
      : 0

  // Get quizzes not yet attempted
  const attemptedQuizIds = new Set(attempts?.map((a) => a.quiz_id) || [])
  const unattemptedQuizzes = allQuizzes?.filter((q) => !attemptedQuizIds.has(q.id)) || []

  // Get recent attempts
  const recentAttempts = attempts?.slice(0, 5) || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Welcome back, {userData.full_name || userData.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttempts}</div>
              <p className="text-xs text-muted-foreground">{completedAttempts} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgScore}%</div>
              <p className="text-xs text-muted-foreground">across all quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">of started quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Quizzes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unattemptedQuizzes.length}</div>
              <p className="text-xs text-muted-foreground">ready to take</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Quizzes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Quizzes</h2>
              <Link href="/student/quizzes">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {unattemptedQuizzes.length > 0 ? (
              <div className="space-y-4">
                {unattemptedQuizzes.slice(0, 5).map((quiz) => (
                  <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{quiz.title}</h3>
                        <Badge variant="outline" className="ml-2">
                          {quiz.questions?.length || 0} questions
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {quiz.description || "No description available"}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {quiz.time_limit && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {quiz.time_limit} min
                            </span>
                          )}
                          <span>{quiz.max_attempts} attempt(s)</span>
                        </div>
                        <Link href={`/student/quiz/${quiz.id}`}>
                          <Button size="sm">
                            <Play className="h-3 w-3 mr-1" />
                            Start Quiz
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No new quizzes</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You've completed all available quizzes. Check back later for new ones!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Attempts */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attempts</h2>
              <Link href="/student/results">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <Card key={attempt.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {attempt.quizzes?.title || "Unknown Quiz"}
                        </h3>
                        <Badge
                          variant={attempt.completed_at ? "default" : "secondary"}
                          className={
                            attempt.completed_at
                              ? attempt.score && attempt.score >= 70
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : ""
                          }
                        >
                          {attempt.completed_at
                            ? `${Math.round(attempt.score || 0)}%`
                            : `Attempt ${attempt.attempt_number}`}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                        <span>
                          {attempt.completed_at
                            ? `Completed ${new Date(attempt.completed_at).toLocaleDateString()}`
                            : `Started ${new Date(attempt.started_at).toLocaleDateString()}`}
                        </span>
                        {attempt.time_taken && <span>{Math.round(attempt.time_taken / 60)} minutes</span>}
                      </div>
                      {!attempt.completed_at && (
                        <div className="mt-3">
                          <Link href={`/student/quiz/${attempt.quiz_id}/continue/${attempt.id}`}>
                            <Button size="sm" variant="outline" className="bg-transparent">
                              Continue Quiz
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No attempts yet</h3>
                  <p className="text-gray-600 dark:text-gray-300">Start taking quizzes to see your progress here!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
