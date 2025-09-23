import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, BookOpen, AlertTriangle, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "@/components/auth/logout-button"

export default async function AdminDashboard() {
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

  // Get system statistics
  const [
    { count: totalUsers },
    { count: totalTeachers },
    { count: totalStudents },
    { count: totalQuizzes },
    { count: publishedQuizzes },
    { count: totalAttempts },
    { count: completedAttempts },
    { count: flaggedAttempts },
    { count: totalViolations },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("quizzes").select("*", { count: "exact", head: true }),
    supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }).not("completed_at", "is", null),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("is_flagged", true),
    supabase.from("cheating_logs").select("*", { count: "exact", head: true }),
  ])

  // Get recent activities
  const { data: recentUsers } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentQuizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      users!quizzes_teacher_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentViolations } = await supabase
    .from("cheating_logs")
    .select(`
      *,
      quiz_attempts(
        quizzes(title),
        users(full_name, email)
      )
    `)
    .order("timestamp", { ascending: false })
    .limit(10)

  // Calculate completion rate
  const completionRate = totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">System overview and management</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totalTeachers || 0} teachers, {totalStudents || 0} students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuizzes || 0}</div>
              <p className="text-xs text-muted-foreground">{publishedQuizzes || 0} published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttempts || 0}</div>
              <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalViolations || 0}</div>
              <p className="text-xs text-muted-foreground">{flaggedAttempts || 0} flagged attempts</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Users</CardTitle>
                <Link href="/admin/users">
                  <Badge variant="outline" className="cursor-pointer">
                    View All
                  </Badge>
                </Link>
              </div>
              <CardDescription>Latest user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers && recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{user.full_name || user.email}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === "teacher" ? "default" : "secondary"}>{user.role}</Badge>
                        <span className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No users found</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Quizzes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Quizzes</CardTitle>
                <Link href="/admin/quizzes">
                  <Badge variant="outline" className="cursor-pointer">
                    View All
                  </Badge>
                </Link>
              </div>
              <CardDescription>Latest quiz creations</CardDescription>
            </CardHeader>
            <CardContent>
              {recentQuizzes && recentQuizzes.length > 0 ? (
                <div className="space-y-4">
                  {recentQuizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium line-clamp-1">{quiz.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          by {quiz.users?.full_name || quiz.users?.email || "Unknown"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={quiz.is_published ? "default" : "secondary"}>
                          {quiz.is_published ? "Published" : "Draft"}
                        </Badge>
                        {quiz.anti_cheating_enabled && <Shield className="h-3 w-3 text-blue-600" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No quizzes found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Violations */}
        {recentViolations && recentViolations.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Recent Security Violations
                </CardTitle>
                <Link href="/admin/violations">
                  <Badge variant="outline" className="cursor-pointer">
                    View All
                  </Badge>
                </Link>
              </div>
              <CardDescription>Latest anti-cheating incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentViolations.slice(0, 5).map((violation) => (
                  <div
                    key={violation.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-red-800 dark:text-red-200">
                        {violation.incident_type.replace("_", " ").toUpperCase()}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-300">
                        Quiz: {violation.quiz_attempts?.quizzes?.title || "Unknown"}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-300">
                        Student:{" "}
                        {violation.quiz_attempts?.users?.full_name ||
                          violation.quiz_attempts?.users?.email ||
                          "Unknown"}
                      </div>
                    </div>
                    <div className="text-xs text-red-500">{new Date(violation.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/users">
                <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Manage Users</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">View and manage all users</div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/quizzes">
                <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Manage Quizzes</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Oversee all quiz content</div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/violations">
                <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">Security Reports</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Review security incidents</div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
