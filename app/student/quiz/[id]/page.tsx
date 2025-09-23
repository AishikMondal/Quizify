"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Camera, Monitor, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import type { Quiz } from "@/lib/types"

export default function QuizStartPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [userAttempts, setUserAttempts] = useState(0)
  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        // Get quiz details
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select(`
            *,
            questions(id)
          `)
          .eq("id", quizId)
          .eq("is_published", true)
          .single()

        if (quizError) throw quizError
        if (!quizData) throw new Error("Quiz not found")

        setQuiz(quizData)

        // Get user's attempts for this quiz
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("student_id", user.id)

        setUserAttempts(attempts?.length || 0)
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [quizId, router])

  const startQuiz = async () => {
    setIsStarting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Check if user has exceeded max attempts
      if (quiz && userAttempts >= quiz.max_attempts) {
        throw new Error("You have exceeded the maximum number of attempts for this quiz")
      }

      // Create new attempt
      const { data: attempt, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          student_id: user.id,
          attempt_number: userAttempts + 1,
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      // Redirect to quiz taking interface
      router.push(`/student/quiz/${quizId}/take/${attempt.id}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error || "Quiz not found"}</p>
            <Link href="/student/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canTakeQuiz = userAttempts < quiz.max_attempts
  const questionsCount = quiz.questions?.length || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Overview</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quiz Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <CardDescription>{quiz.description || "No description provided"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quiz Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{questionsCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {quiz.time_limit ? `${quiz.time_limit}m` : "∞"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Time Limit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{quiz.max_attempts}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Max Attempts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{userAttempts}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Used Attempts</div>
                  </div>
                </div>

                {/* Quiz Features */}
                <div>
                  <h3 className="font-medium mb-3">Quiz Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {quiz.shuffle_questions && <Badge variant="outline">Shuffled Questions</Badge>}
                    {quiz.shuffle_options && <Badge variant="outline">Shuffled Options</Badge>}
                    {quiz.show_results && <Badge variant="outline">Results Shown</Badge>}
                    {!quiz.show_results && <Badge variant="outline">Results Hidden</Badge>}
                  </div>
                </div>

                {/* Security Features */}
                {quiz.anti_cheating_enabled && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Features
                    </h3>
                    <div className="space-y-2 text-sm">
                      {quiz.webcam_required && (
                        <div className="flex items-center gap-2 text-amber-600">
                          <Camera className="h-4 w-4" />
                          Webcam monitoring required
                        </div>
                      )}
                      {quiz.fullscreen_required && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Monitor className="h-4 w-4" />
                          Fullscreen mode required
                        </div>
                      )}
                      {!quiz.tab_switching_allowed && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Users className="h-4 w-4" />
                          Tab switching not allowed
                        </div>
                      )}
                      {!quiz.copy_paste_allowed && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Shield className="h-4 w-4" />
                          Copy/paste disabled
                        </div>
                      )}
                      {!quiz.right_click_allowed && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Shield className="h-4 w-4" />
                          Right-click disabled
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Start Quiz Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Ready to Start?</CardTitle>
                <CardDescription>
                  {canTakeQuiz
                    ? "Make sure you're ready before starting the quiz"
                    : "You have used all available attempts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canTakeQuiz ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Attempts remaining:</span>
                        <span className="font-medium">{quiz.max_attempts - userAttempts}</span>
                      </div>
                      {quiz.time_limit && (
                        <div className="flex justify-between">
                          <span>Time limit:</span>
                          <span className="font-medium">{quiz.time_limit} minutes</span>
                        </div>
                      )}
                    </div>

                    {quiz.anti_cheating_enabled && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          <strong>Important:</strong> This quiz has anti-cheating features enabled. Make sure you're in
                          a quiet environment and ready to focus.
                        </p>
                      </div>
                    )}

                    <Button onClick={startQuiz} disabled={isStarting} className="w-full">
                      {isStarting ? "Starting Quiz..." : "Start Quiz"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      You have used all {quiz.max_attempts} attempt(s) for this quiz.
                    </p>
                    <Link href="/student/dashboard">
                      <Button variant="outline" className="bg-transparent">
                        Back to Dashboard
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
