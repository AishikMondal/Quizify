import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen, Users, BarChart3, Settings } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"

export default async function TeacherDashboard() {
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

  // Get teacher's quizzes with stats
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      quiz_attempts(id, completed_at, score)
    `)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

  const totalQuizzes = quizzes?.length || 0
  const publishedQuizzes = quizzes?.filter((q) => q.is_published).length || 0
  const totalAttempts = quizzes?.reduce((acc, quiz) => acc + (quiz.quiz_attempts?.length || 0), 0) || 0
  const completedAttempts =
    quizzes?.reduce(
      (acc, quiz) => acc + (quiz.quiz_attempts?.filter((attempt) => attempt.completed_at).length || 0),
      0,
    ) || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuizzes}</div>
              <p className="text-xs text-muted-foreground">{publishedQuizzes} published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttempts}</div>
              <p className="text-xs text-muted-foreground">{completedAttempts} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">of all attempts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const completedWithScores = quizzes
                    ?.flatMap((q) => q.quiz_attempts || [])
                    .filter((a) => a.completed_at && a.score !== null)
                  const avgScore =
                    completedWithScores && completedWithScores.length > 0
                      ? completedWithScores.reduce((acc, a) => acc + (a.score || 0), 0) / completedWithScores.length
                      : 0
                  return Math.round(avgScore)
                })()}%
              </div>
              <p className="text-xs text-muted-foreground">across all quizzes</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/teacher/quiz/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Quiz
              </Button>
            </Link>
            <Link href="/teacher/quizzes">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <BookOpen className="h-4 w-4" />
                Manage Quizzes
              </Button>
            </Link>
            <Link href="/teacher/analytics">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Quizzes */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Quizzes</h2>
            <Link href="/teacher/quizzes">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.slice(0, 6).map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          quiz.is_published
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {quiz.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-2">{quiz.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                      <span>{quiz.quiz_attempts?.length || 0} attempts</span>
                      <span>{quiz.time_limit ? `${quiz.time_limit} min` : "No limit"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/teacher/quiz/${quiz.id}/edit`}>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/teacher/quiz/${quiz.id}/results`}>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          Results
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quizzes yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Get started by creating your first quiz</p>
                <Link href="/teacher/quiz/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
