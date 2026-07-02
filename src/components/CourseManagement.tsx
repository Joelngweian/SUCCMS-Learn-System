import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase.ts";
import { useAuth } from "@/contexts/AuthContext.tsx";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
  removeCourseOfferingFiles,
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import { CoursePage } from "./CoursePage"; 
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  MoreHorizontal,
  Search,
  Loader2,
  Trash2,
} from "lucide-react";
import { confirmAction } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import {
  getAcademicTermOptions,
  getCurrentEnrollmentTerm,
  invalidateCourseCache,
  type AcademicTermOption,
} from "@/data/courseRepository";
import {
  getFallbackCurrentAcademicTerm,
} from "@/data/studyPlanUtils";
import { CourseCreationRequestDialog } from "./course/CourseCreationRequestDialog";
import {
  assessmentRowsToValues,
  getCourseAssessmentStructures,
  saveCourseAssessmentStructure,
  type CourseAssessmentItem,
  type CourseAssessmentValues,
} from "@/data/courseAssessmentRepository";
import {
  CourseAssessmentDialog,
  CourseAssessmentSummary,
} from "./course/CourseAssessmentStructure";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function CourseManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  type TeachingCourse = NormalizedCourseOffering & {
    assessmentStructure?: CourseAssessmentItem[] | null;
  };
  const [myCourses, setMyCourses] = useState<TeachingCourse[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTermOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTermCode, setCurrentTermCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [droppingCourseId, setDroppingCourseId] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [assessmentCourseToEdit, setAssessmentCourseToEdit] =
    useState<TeachingCourse | null>(null);
  
  // View Switching
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const profileId = profile?.id;
  const isCalendarBackedAcademicTerm = (term?: AcademicTermOption | null) => Boolean(
    term?.code
    && (term.starts_at || term.teaching_starts_at)
    && (term.ends_at || term.teaching_ends_at),
  );

  // Open CoursePage directly when courseId is present in URL
  useEffect(() => {
    const urlCourseId = searchParams.get('courseId');
    if (urlCourseId && urlCourseId !== selectedCourseId) {
      setSelectedCourseId(urlCourseId);
    }
  }, [searchParams, selectedCourseId]);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      let resolvedTermCode = getFallbackCurrentAcademicTerm().code;

      try {
        const term = await getCurrentEnrollmentTerm();
        if (term?.code) {
          resolvedTermCode = term.code;
        }
      } catch (termError) {
        console.warn("Failed to resolve current semester:", termError);
      }

      setCurrentTermCode(resolvedTermCode);

      try {
        setAcademicTerms(await getAcademicTermOptions());
      } catch (termOptionsError) {
        console.warn("Failed to load academic term options:", termOptionsError);
        setAcademicTerms([]);
      }

      // 2. Fetch the lecturer's course instances
      const { data: myData } = await supabase
        .from('course_instructors')
        .select(`course_id, course_offerings(${COURSE_OFFERING_SELECT})`)
        .eq('user_id', profileId);

      const normalizedCourses =
        myData
          ?.map((row) => normalizeCourseOffering(row.course_offerings))
          .filter((course) => Boolean(course.id)) || [];
      try {
        const assessmentStructures = await getCourseAssessmentStructures(
          normalizedCourses.map(course => course.id),
        );
        setMyCourses(
          normalizedCourses.map(course => ({
            ...course,
            assessmentStructure: assessmentStructures.get(course.id) || null,
          })),
        );
      } catch (assessmentError) {
        console.error("Failed to load assessment structures:", assessmentError);
        setMyCourses(normalizedCourses);
      }
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (profileId) void fetchData();
  }, [fetchData, profileId]);

  const getCourseCode = (course: NormalizedCourseOffering) =>
    course.course_code || course.code || "N/A";
  const formatAssessmentPercent = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(1);

  const CompactAssessmentSummary = ({
    structure,
  }: {
    structure?: CourseAssessmentValues | null;
  }) => {
    if (!structure?.length) {
      return (
        <p className="text-xs text-muted-foreground">
          Assessment structure pending.
        </p>
      );
    }

    const summary = [
      { label: "Tests", types: ["test"] },
      { label: "Assignments", types: ["individual_assignment"] },
      { label: "Projects", types: ["group_project"] },
      { label: "Final", types: ["final_exam"] },
    ]
      .map(group => ({
        label: group.label,
        weight: structure
          .filter(item => group.types.includes(item.itemType))
          .reduce((total, item) => total + item.weightPercentage, 0),
      }))
      .filter(group => group.weight > 0);

    return (
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Assessment:</span>{" "}
        {summary
          .map(
            group =>
              `${group.label} ${formatAssessmentPercent(group.weight)}%`,
          )
          .join(" 鐠?")}
      </p>
    );
  };

  const handleSaveAssessment = async (values: CourseAssessmentValues) => {
    if (!assessmentCourseToEdit) return;

    await saveCourseAssessmentStructure({
      courseId: assessmentCourseToEdit.id,
      values,
    });
    setAssessmentCourseToEdit(null);
    await fetchData();
    notify.success("Assessment structure updated.");
  };

  const handleDropCourse = async (course: NormalizedCourseOffering) => {
    if (!profile?.id) return;
    const courseName = course?.name || "this course";
    const confirmed = await confirmAction({
      title: `Permanently drop ${courseName}?`,
      description:
        "All enrolled students, posts, discussions, files, assignments, submissions, grades, and attendance for this class will be deleted. This cannot be undone.",
      confirmLabel: "Drop Course",
      destructive: true,
    });
    if (!confirmed) return;

    setDroppingCourseId(course.id);
    try {
      try {
        await removeCourseOfferingFiles(course.id);
      } catch (storageError) {
        console.warn("Some course files could not be removed:", storageError);
      }

      const { error } = await supabase.rpc('drop_course_offering', {
        p_offering_id: course.id
      });

      if (!error) {
        invalidateCourseCache({
          courseId: course.id,
          userId: profile.id,
        });
        setMyCourses((current) => current.filter((item) => item.id !== course.id));
      } else {
        console.error("Error dropping course:", error);
        notify.error(error, "Failed to drop course.");
      }
    } finally {
      setDroppingCourseId(null);
    }
  };

  const openCourse = (courseId: string) => {
    if (!courseId) {
      notify.error(
        new Error("This course offering does not have a valid ID."),
        "Cannot open course.",
      );
      return;
    }
    setSelectedCourseId(courseId);
  };

  const semesterOptions = useMemo(() => {
    const seen = new Set<string>();
    return academicTerms
      .filter(isCalendarBackedAcademicTerm)
      .map(term => String(term.code || "").trim().toUpperCase())
      .filter(code => /^\d{4}[ABC]$/.test(code))
      .filter(code => {
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      });
  }, [academicTerms]);


  // --- VIEW LOGIC ---

  if (selectedCourseId) {
    return <CoursePage courseId={selectedCourseId} onBack={() => { setSelectedCourseId(null); navigate('/courses', { replace: true }); }} />;
  }

  const filteredMyCourses = myCourses.filter(course => {
    const courseCode = getCourseCode(course).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query
      || course.name.toLowerCase().includes(query)
      || courseCode.includes(query);
    const matchesSemester =
      semesterFilter === "all" || course.semester === semesterFilter;

    return matchesSearch && matchesSemester;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lecturer Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:hidden">
            Manage courses assigned by AARO Staff.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setIsRequestDialogOpen(true)}
        >
          Request New Course Creation
        </Button>
      </div>

      <CourseCreationRequestDialog
        open={isRequestDialogOpen}
        requesterId={profileId || null}
        onOpenChange={setIsRequestDialogOpen}
      />

      <div className="my-3 grid gap-2 sm:my-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assigned courses..."
            className="pl-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Filter semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {semesterOptions.map(termCode => (
              <SelectItem key={termCode} value={termCode}>
                {termCode}
                {termCode === currentTermCode ? " (Current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {myCourses.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center">
          <p className="font-medium">No courses assigned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AARO Staff will assign teaching courses to your account.
          </p>
        </div>
      ) : filteredMyCourses.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center">
          <p className="font-medium">No assigned courses match this filter.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another keyword or semester.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {filteredMyCourses.map(course => (
            <Card
              key={course.id}
              className="hover:border-primary cursor-pointer transition-colors border-l-4 border-l-blue-500"
              onClick={() => openCourse(course.id)}
            >
              <CardHeader className="p-3 pb-2 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getCourseCode(course)}</Badge>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">
                      Teaching
                    </Badge>
                  </div>
                  {course.owner_id === profile?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground"
                          disabled={droppingCourseId === course.id}
                          onClick={event => event.stopPropagation()}
                        >
                          {droppingCourseId === course.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                          <span className="sr-only">Course actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={event => {
                            event.stopPropagation();
                            handleDropCourse(course);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Drop Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardTitle className="mt-2 line-clamp-2 text-base sm:text-lg">
                  {course.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="mb-2 text-sm text-muted-foreground sm:mb-4">
                  {course.faculty}
                </div>
                <div className="sm:hidden">
                  <CompactAssessmentSummary
                    structure={
                      course.assessmentStructure
                        ? assessmentRowsToValues(course.assessmentStructure)
                        : null
                    }
                  />
                </div>
                <div className="hidden sm:block">
                  <CourseAssessmentSummary
                    structure={
                      course.assessmentStructure
                        ? assessmentRowsToValues(course.assessmentStructure)
                        : null
                    }
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex">
                  <Button
                    className="w-full sm:flex-1"
                    onClick={event => {
                      event.stopPropagation();
                      openCourse(course.id);
                    }}
                  >
                    Manage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={event => {
                      event.stopPropagation();
                      setAssessmentCourseToEdit(course);
                    }}
                  >
                    Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CourseAssessmentDialog
        open={Boolean(assessmentCourseToEdit)}
        onOpenChange={open => {
          if (!open) setAssessmentCourseToEdit(null);
        }}
        courseName={assessmentCourseToEdit?.name || "Course"}
        mode="edit"
        initialValues={
          assessmentCourseToEdit?.assessmentStructure
            ? assessmentRowsToValues(
                assessmentCourseToEdit.assessmentStructure,
              )
            : null
        }
        onSubmit={handleSaveAssessment}
      />
    </div>
  );
}
