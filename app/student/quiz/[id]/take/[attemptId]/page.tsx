"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Clock, AlertTriangle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { QuizSecurityWrapper } from "@/components/anti-cheating/quiz-security-wrapper"
import type { Quiz, Question, StudentAnswer, QuestionOption } from "@/lib/types"

export default function TakeQuizPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [securityReady, setSecurityReady] = useState(false)

  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string
  const attemptId = params.attemptId as string

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  // Load quiz and questions
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        // Verify attempt belongs to user
        const { data: attempt, error: attemptError } = await supabase
          .from("quiz_attempts")
          .select("*")
          .eq("id", attemptId)
          .eq("student_id", user.id)
          .single()

        if (attemptError || !attempt) {
          throw new Error("Invalid quiz attempt")
        }

        if (attempt.completed_at) {
          router.push(`/student/quiz/${quizId}/result/${attemptId}`)
          return
        }

        // Get quiz with questions and options
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select(`
            *,
            questions(
              *,
              question_options(*)
            )
          `)
          .eq("id", quizId)
          .single()

        if (quizError) throw quizError

        setQuiz(quizData)

        // Process questions
        let processedQuestions = quizData.questions || []

        // Shuffle questions if enabled
        if (quizData.shuffle_questions) {
          processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5)
        }

        // Shuffle options if enabled
        if (quizData.shuffle_options) {
          processedQuestions = processedQuestions.map((q: Question) => ({
            ...q,
            options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : [],
          }))
        }

        setQuestions(processedQuestions)

        // Set timer if quiz has time limit
        if (quizData.time_limit) {
          const elapsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
          const remaining = quizData.time_limit * 60 - elapsed
          setTimeRemaining(Math.max(0, remaining))
        }

        // Load existing answers
        const { data: existingAnswers } = await supabase.from("student_answers").select("*").eq("attempt_id", attemptId)

        if (existingAnswers) {
          const answersMap: Record<string, StudentAnswer> = {}
          existingAnswers.forEach((answer) => {
            answersMap[answer.question_id] = answer
          })
          setAnswers(answersMap)
        }
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [quizId, attemptId, router])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || !securityReady) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          submitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, securityReady])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const saveAnswer = async (questionId: string, answer: Partial<StudentAnswer>) => {
    try {
      const supabase = createClient()

      const answerData = {
        attempt_id: attemptId,
        question_id: questionId,
        selected_option_id: answer.selected_option_id || null,
        text_answer: answer.text_answer || null,
      }

      // Upsert answer
      const { error } = await supabase
        .from("student_answers")
        .upsert(answerData, { onConflict: "attempt_id,question_id" })

      if (error) throw error

      // Update local state
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          id: prev[questionId]?.id || "",
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: answer.selected_option_id ?? prev[questionId]?.selected_option_id,
          text_answer: answer.text_answer ?? prev[questionId]?.text_answer,
          is_correct: prev[questionId]?.is_correct,
          points_earned: prev[questionId]?.points_earned ?? 0,
          answered_at: new Date().toISOString(),
        },
      }))
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const handleAnswerChange = (questionId: string, answer: Partial<StudentAnswer>) => {
    saveAnswer(questionId, answer)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitQuiz = useCallback(async () => {
    if (submitting) return

    setSubmitting(true)
    try {
      const supabase = createClient()
      const endTime = Date.now()
      const timeTaken = Math.floor((endTime - startTime) / 1000)

      // Calculate score
      let totalPoints = 0
      let earnedPoints = 0

      for (const question of questions) {
        totalPoints += question.points
        const answer = answers[question.id]

        if (answer) {
          if (question.question_type === "multiple_choice") {
            const selectedOption = question.options?.find((opt: QuestionOption) => opt.id === answer.selected_option_id)
            if (selectedOption?.is_correct) {
              earnedPoints += question.points
            }
          } else if (question.question_type === "true_false") {
            const correctOption = question.options?.find((opt: QuestionOption) => opt.is_correct)
            if (correctOption?.id === answer.selected_option_id) {
              earnedPoints += question.points
            }
          }
          // Note: Short answer questions would need manual grading
        }
      }

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

      // Update attempt
      const { error: attemptError } = await supabase
        .from("quiz_attempts")
        .update({
          completed_at: new Date().toISOString(),
          score: score,
          total_points: totalPoints,
          time_taken: timeTaken,
        })
        .eq("id", attemptId)

      if (attemptError) throw attemptError

      // Update answer scores
      for (const question of questions) {
        const answer = answers[question.id]
        if (answer) {
          let isCorrect = false
          let pointsEarned = 0

          if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
            const selectedOption = question.options?.find((opt: QuestionOption) => opt.id === answer.selected_option_id)
            isCorrect = selectedOption?.is_correct || false
            pointsEarned = isCorrect ? question.points : 0
          }

          await supabase
            .from("student_answers")
            .update({
              is_correct: isCorrect,
              points_earned: pointsEarned,
            })
            .eq("attempt_id", attemptId)
            .eq("question_id", question.id)
        }
      }

      router.push(`/student/quiz/${quizId}/result/${attemptId}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to submit quiz")
      setSubmitting(false)
    }
  }, [submitting, questions, answers, attemptId, startTime, router, quizId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !quiz || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
            <p className="text-gray-600 dark:text-gray-300">{error || "Quiz not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const QuizContent = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with timer and progress */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span
                    className={`font-mono ${timeRemaining < 300 ? "text-red-600" : "text-gray-900 dark:text-white"}`}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              {timeRemaining !== null && timeRemaining < 300 && <AlertTriangle className="h-4 w-4 text-red-600" />}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({currentQuestion.points} point{currentQuestion.points !== 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap">{currentQuestion.question_text}</div>

            {/* Multiple Choice */}
            {currentQuestion.question_type === "multiple_choice" && (
              <RadioGroup
                value={answers[currentQuestion.id]?.selected_option_id || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, { selected_option_id: value })}
                  disabled={submitting}
              >
                <div className="space-y-3">
                  {/* Always show at least two radio buttons for demonstration */}
                  {(currentQuestion.options?.length ?? 0) >= 2
                    ? currentQuestion.options?.map((option: QuestionOption) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} disabled={submitting} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.option_text}
                          </Label>
                        </div>
                      ))
                    : [
                        <div key="option1" className="flex items-center space-x-2">
                          <RadioGroupItem value="option1" id="option1" disabled={submitting} />
                          <Label htmlFor="option1" className="flex-1 cursor-pointer">Option 1</Label>
                        </div>,
                        <div key="option2" className="flex items-center space-x-2">
                          <RadioGroupItem value="option2" id="option2" disabled={submitting} />
                          <Label htmlFor="option2" className="flex-1 cursor-pointer">Option 2</Label>
                        </div>
                      ]}
                </div>
              </RadioGroup>
            )}

            {/* True/False */}
            {currentQuestion.question_type === "true_false" && (
              <RadioGroup
                value={answers[currentQuestion.id]?.selected_option_id || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, { selected_option_id: value })}
                  disabled={submitting}
              >
                <div className="space-y-3">
                  {currentQuestion.options?.map((option: QuestionOption) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} disabled={submitting} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {/* Short Answer */}
            {currentQuestion.question_type === "short_answer" && (
                <Textarea
                  value={answers[currentQuestion.id]?.text_answer || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, { text_answer: e.target.value })}
                  placeholder="Enter your answer here..."
                  rows={4}
                  disabled={submitting}
                />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0 || submitting}
              className="bg-transparent"
            >
              Previous
            </Button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${
                    index === currentQuestionIndex
                      ? "bg-blue-600 text-white"
                      : answers[questions[index].id]
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  disabled={submitting}
                >
                  {index + 1}
                </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
              <Button onClick={submitQuiz} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
          ) : (
              <Button onClick={nextQuestion} disabled={submitting}>Next</Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <QuizSecurityWrapper quiz={quiz} attemptId={attemptId} onSecurityReady={() => setSecurityReady(true)}>
      <QuizContent />
    </QuizSecurityWrapper>
  )
}
