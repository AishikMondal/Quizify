import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Get user role and redirect accordingly
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role === "teacher") {
      redirect("/teacher/dashboard")
    } else {
      redirect("/student/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to <span className="text-blue-600">QuizEthic</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            The most secure online quiz platform with advanced anti-cheating features. Create, manage, and take quizzes
            with confidence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-600">For Teachers</CardTitle>
              <CardDescription>
                Create and manage secure quizzes with comprehensive anti-cheating features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Advanced quiz builder with multiple question types</li>
                <li>• Real-time monitoring and cheating detection</li>
                <li>• Detailed analytics and reporting</li>
                <li>• Customizable security settings</li>
              </ul>
              <Link href="/auth/login?role=teacher">
                <Button className="w-full">Get Started as Teacher</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">For Students</CardTitle>
              <CardDescription>Take quizzes in a secure, monitored environment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Clean, distraction-free quiz interface</li>
                <li>• Instant feedback and results</li>
                <li>• Progress tracking</li>
                <li>• Fair and secure testing environment</li>
              </ul>
              <Link href="/auth/login?role=student">
                <Button variant="outline" className="w-full bg-transparent">
                  Get Started as Student
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Anti-Cheating Technology</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced monitoring including webcam surveillance, tab switching detection, and fullscreen enforcement
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-green-600">Real-time Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Comprehensive reporting and analytics to track student performance and identify potential issues
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-purple-600">Flexible Quiz Builder</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create quizzes with multiple question types, time limits, and customizable security settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
