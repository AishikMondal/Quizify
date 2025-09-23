"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Question, QuestionOption } from "@/lib/types"

interface QuestionForm extends Omit<Question, "id" | "quiz_id" | "created_at"> {
  options: Omit<QuestionOption, "id" | "question_id" | "created_at">[]
}

export default function CreateQuizPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState<number | undefined>()
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const [showResults, setShowResults] = useState(true)
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(true)
  const [webcamRequired, setWebcamRequired] = useState(false)
  const [fullscreenRequired, setFullscreenRequired] = useState(true)
  const [tabSwitchingAllowed, setTabSwitchingAllowed] = useState(false)
  const [copyPasteAllowed, setCopyPasteAllowed] = useState(false)
  const [rightClickAllowed, setRightClickAllowed] = useState(false)
  const [questions, setQuestions] = useState<QuestionForm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const addQuestion = () => {
    const newQuestion: QuestionForm = {
      question_text: "",
      question_type: "multiple_choice",
      points: 1,
      order_index: questions.length,
      options: [
        { option_text: "", is_correct: true, order_index: 0 },
        { option_text: "", is_correct: false, order_index: 1 },
      ],
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    const question = updated[questionIndex]
    question.options.push({
      option_text: "",
      is_correct: false,
      order_index: question.options.length,
    })
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex)
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: keyof QuestionOption, value: any) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      [field]: value,
    }
    setQuestions(updated)
  }

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options.forEach((option, i) => {
      option.is_correct = i === optionIndex
    })
    setQuestions(updated)
  }

  const handleSubmit = async (isDraft = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Validate form
      if (!title.trim()) throw new Error("Quiz title is required")
      if (questions.length === 0) throw new Error("At least one question is required")

      // Validate questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        if (!question.question_text.trim()) throw new Error(`Question ${i + 1} text is required`)

        if (question.question_type === "multiple_choice") {
          if (question.options.length < 2) throw new Error(`Question ${i + 1} needs at least 2 options`)
          const hasCorrect = question.options.some((opt) => opt.is_correct)
          if (!hasCorrect) throw new Error(`Question ${i + 1} needs at least one correct answer`)
        }
      }

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title,
          description: description || null,
          teacher_id: user.id,
          time_limit: timeLimit || null,
          max_attempts: maxAttempts,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          show_results: showResults,
          anti_cheating_enabled: antiCheatingEnabled,
          webcam_required: webcamRequired,
          fullscreen_required: fullscreenRequired,
          tab_switching_allowed: tabSwitchingAllowed,
          copy_paste_allowed: copyPasteAllowed,
          right_click_allowed: rightClickAllowed,
          is_published: !isDraft,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const { data: createdQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            question_type: question.question_type,
            points: question.points,
            order_index: i,
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Create options for multiple choice questions
        if (question.question_type === "multiple_choice") {
          const optionsToInsert = question.options.map((option, j) => ({
            question_id: createdQuestion.id,
            option_text: option.option_text,
            is_correct: option.is_correct,
            order_index: j,
          }))

          const { error: optionsError } = await supabase.from("question_options").insert(optionsToInsert)
          if (optionsError) throw optionsError
        }
      }

      router.push("/teacher/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/teacher/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Quiz</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">{error}</div>}

        {/* Basic Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Set up the basic details for your quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter quiz description (optional)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit || ""}
                  onChange={(e) => setTimeLimit(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number.parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
            <CardDescription>Configure how your quiz behaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                  <Switch id="shuffleQuestions" checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffleOptions">Shuffle Options</Label>
                  <Switch id="shuffleOptions" checked={shuffleOptions} onCheckedChange={setShuffleOptions} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showResults">Show Results</Label>
                  <Switch id="showResults" checked={showResults} onCheckedChange={setShowResults} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="antiCheating">Anti-Cheating</Label>
                  <Switch id="antiCheating" checked={antiCheatingEnabled} onCheckedChange={setAntiCheatingEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="webcamRequired">Webcam Required</Label>
                  <Switch id="webcamRequired" checked={webcamRequired} onCheckedChange={setWebcamRequired} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="fullscreenRequired">Fullscreen Required</Label>
                  <Switch
                    id="fullscreenRequired"
                    checked={fullscreenRequired}
                    onCheckedChange={setFullscreenRequired}
                  />
                </div>
              </div>
            </div>

            {antiCheatingEnabled && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium mb-3">Advanced Anti-Cheating Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tabSwitching">Allow Tab Switching</Label>
                    <Switch id="tabSwitching" checked={tabSwitchingAllowed} onCheckedChange={setTabSwitchingAllowed} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="copyPaste">Allow Copy/Paste</Label>
                    <Switch id="copyPaste" checked={copyPasteAllowed} onCheckedChange={setCopyPasteAllowed} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rightClick">Allow Right Click</Label>
                    <Switch id="rightClick" checked={rightClickAllowed} onCheckedChange={setRightClickAllowed} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Add questions to your quiz</CardDescription>
              </div>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions added yet. Click "Add Question" to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Question {questionIndex + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Question Text *</Label>
                        <Textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(questionIndex, "question_text", e.target.value)}
                          placeholder="Enter your question"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Question Type</Label>
                          <Select
                            value={question.question_type}
                            onValueChange={(value) => updateQuestion(questionIndex, "question_type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) =>
                              updateQuestion(questionIndex, "points", Number.parseInt(e.target.value) || 1)
                            }
                            min="1"
                          />
                        </div>
                      </div>

                      {question.question_type === "multiple_choice" && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <Label>Options</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(questionIndex)}
                              disabled={question.options.length >= 6}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`question-${questionIndex}-correct`}
                                  checked={option.is_correct}
                                  onChange={() => setCorrectOption(questionIndex, optionIndex)}
                                  className="mt-1"
                                />
                                <Input
                                  value={option.option_text}
                                  onChange={(e) =>
                                    updateOption(questionIndex, optionIndex, "option_text", e.target.value)
                                  }
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="flex-1"
                                />
                                {question.options.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(questionIndex, optionIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Select the radio button next to the correct answer
                          </p>
                        </div>
                      )}

                      {question.question_type === "true_false" && (
                        <div>
                          <Label>Correct Answer</Label>
                          <Select
                            value={question.options[0]?.is_correct ? "true" : "false"}
                            onValueChange={(value) => {
                              const updated = [...questions]
                              updated[questionIndex].options = [
                                { option_text: "True", is_correct: value === "true", order_index: 0 },
                                { option_text: "False", is_correct: value === "false", order_index: 1 },
                              ]
                              setQuestions(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isLoading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isLoading}>
            {isLoading ? "Creating..." : "Publish Quiz"}
          </Button>
        </div>
      </div>
    </div>
  )
}
