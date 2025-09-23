import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Mail, Calendar } from "lucide-react"
import Link from "next/link"

export default async function AdminUsersPage() {
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

  // Get all users with their quiz statistics
  const { data: users } = await supabase
    .from("users")
    .select(`
      *,
      quizzes(id),
      quiz_attempts(id, completed_at, score)
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {users && users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => {
              const quizCount = user.quizzes?.length || 0
              const attemptCount = user.quiz_attempts?.length || 0
              const completedAttempts = user.quiz_attempts?.filter((a) => a.completed_at).length || 0
              const avgScore =
                completedAttempts > 0
                  ? Math.round(
                      user.quiz_attempts
                        .filter((a) => a.completed_at && a.score !== null)
                        .reduce((acc, a) => acc + (a.score || 0), 0) / completedAttempts,
                    )
                  : 0

              return (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{user.full_name || "No Name"}</CardTitle>
                      <Badge
                        variant={
                          user.role === "teacher" ? "default" : user.role === "admin" ? "destructive" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>

                    {user.role === "teacher" && (
                      <div className="pt-2 border-t">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Quizzes Created:</span>
                            <span className="font-medium">{quizCount}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {user.role === "student" && (
                      <div className="pt-2 border-t">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Quiz Attempts:</span>
                            <span className="font-medium">{attemptCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Completed:</span>
                            <span className="font-medium">{completedAttempts}</span>
                          </div>
                          {avgScore > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Avg Score:</span>
                              <span className="font-medium">{avgScore}%</span>
                            </div>
                          )}
                        </div>
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
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-gray-600 dark:text-gray-300">No users have registered yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
