import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { BookOpen } from "lucide-react"

interface Course {
  id: string
  name: string
  code: string
}

interface CoursesSectionProps {
  courses: Course[]
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Courses</CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses will appear here when this user is enrolled or assigned.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{course.name}</h3>
                  <p className="text-sm text-muted-foreground">{course.code}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
