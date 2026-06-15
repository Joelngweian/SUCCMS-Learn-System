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
    <Card>
      <CardHeader>
        <CardTitle>Enrolled Courses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{course.name}</h3>
                <p className="text-sm text-muted-foreground">{course.code}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
