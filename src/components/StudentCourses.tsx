import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { subscribeToPrivateBroadcast } from "@/lib/realtime";
import { PROGRAMMES } from "@/lib/programmes";
import {
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import {
  getActiveCourseOfferingsByCodes,
  enrollStudentInCourseWithKey,
  getCurrentEnrollmentTerm,
  getCourseInstructorSummaries,
  getStudentCourseOfferings,
  invalidateCourseCache,
  type CurrentEnrollmentTerm,
} from "@/data/courseRepository";
import {
  getFallbackCurrentAcademicTerm,
  isConcreteStudyPlanEntry,
  type StudyPlanCourseEntry,
} from "@/data/studyPlanUtils";
import { getDbStudyPlanCoursesForStudent } from "@/data/academicPlanningRepository";
import { CoursePage } from "./CoursePage"; // <--- IMPORT THIS
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Search,
  BookOpen,
  Clock,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  Key,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ArrowRightCircle
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";
import {
  assessmentRowsToValues,
  getCourseAssessmentStructures,
  type CourseAssessmentItem,
} from "@/data/courseAssessmentRepository";
import { CourseAssessmentSummary } from "./course/CourseAssessmentStructure";

// --- Types ---
type DbStudyPlanResult = NonNullable<
  Awaited<ReturnType<typeof getDbStudyPlanCoursesForStudent>>
>;

type Course = NormalizedCourseOffering & {
  assessmentStructure?: CourseAssessmentItem[] | null;
  instructors?: CourseInstructor[];
  isOffered?: boolean;
  isEnrolled?: boolean;
  isPlaceholder?: boolean;
  studyPlanEntry?: StudyPlanCourseEntry;
};

interface CourseInstructor {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export function StudentCourses() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Data State
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [programmeOptions, setProgrammeOptions] = useState<{faculty: string, programme: string}[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("my-courses");
  
  // Read courseId from URL search params (e.g., /courses?courseId=xxx&assignmentId=yyy)
  const courseIdFromUrl = searchParams.get('courseId');
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(courseIdFromUrl); // <--- NEW STATE FOR NAVIGATION
  
  // Pagination State
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);
  
  // Enrollment State
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null);
  const [assessmentCourseToView, setAssessmentCourseToView] =
    useState<Course | null>(null);
  const [enrollmentKeyInput, setEnrollmentKeyInput] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [studyPlanMessage, setStudyPlanMessage] = useState<string | null>(null);

  // Profile Setup State
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [selectedProgrammeObj, setSelectedProgrammeObj] = useState<{faculty: string, programme: string} | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState("");

  const profileId = profile?.id;
  const profileEmail = profile?.email;
  const profileRole = profile?.role;
  const profileFaculty = profile?.faculty;
  const profileProgramme = profile?.programme;

  // Sync URL courseId param with viewingCourseId state
  useEffect(() => {
    const urlCourseId = searchParams.get('courseId');
    if (urlCourseId && urlCourseId !== viewingCourseId) {
      setViewingCourseId(urlCourseId);
    }
  }, [searchParams, viewingCourseId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // --- 2. Data Fetching ---

  const fetchProgrammeOptions = () => {
    const options = PROGRAMMES.map(p => ({
      faculty: p.level,
      programme: p.name
    }));
    setProgrammeOptions(options);
  };

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const [myCourses, resolvedTerm] = await Promise.all([
        getStudentCourseOfferings(profileId),
        getCurrentEnrollmentTerm().catch(() => {
          const fallback = getFallbackCurrentAcademicTerm();
          return {
            ...fallback,
            id: fallback.id || "",
          } as CurrentEnrollmentTerm;
        }),
      ]);

      const termCode = resolvedTerm?.code || getFallbackCurrentAcademicTerm().code;
      let studyPlanResult = await getDbStudyPlanCoursesForStudent({
        email: profileEmail,
        programme: profileProgramme,
        studentProfileId: profileId,
        termCode,
      });

      if (!studyPlanResult) {
        studyPlanResult = {
          entries: [] as StudyPlanCourseEntry[],
          programmeKey: null,
          studentId: null,
          isExactMatch: false,
          message:
            "No imported study plan is available for your profile yet. Please contact AARO or your department if this is unexpected.",
        } as DbStudyPlanResult;
      }
      setStudyPlanMessage(studyPlanResult.message || null);

      const concreteStudyPlanEntries = studyPlanResult.entries.filter(
        isConcreteStudyPlanEntry,
      );
      const activeOfferings =
        resolvedTerm?.id
          ? await getActiveCourseOfferingsByCodes({
              courseCodes: concreteStudyPlanEntries
                .map(entry => entry.courseCode)
                .filter((code): code is string => Boolean(code)),
              termId: resolvedTerm.id,
            })
          : [];

      const offeringsByCode = new Map(
        activeOfferings.map(course => [getCourseCode(course), course]),
      );
      const enrolledCourseIds = new Set(myCourses.map(course => course.id));

      let instructorRows = [];
      try {
        instructorRows =
          await getCourseInstructorSummaries([
            ...myCourses.map(course => course.id),
            ...activeOfferings.map(course => course.id),
          ]);
      } catch (instructorError) {
        console.error("Error fetching course instructors", instructorError);
      }
      const instructorsByCourse = new Map<string, CourseInstructor[]>();

      instructorRows.forEach(instructor => {
        const current = instructorsByCourse.get(instructor.courseId) || [];
        current.push({
          avatar_url: instructor.avatarUrl,
          full_name: instructor.fullName,
          id: instructor.id,
        });
        instructorsByCourse.set(instructor.courseId, current);
      });

      let assessmentStructures =
        new Map<string, CourseAssessmentItem[]>();
      try {
        assessmentStructures = await getCourseAssessmentStructures(
          myCourses.map(course => course.id),
        );
      } catch (assessmentError) {
        console.error(
          "Error fetching course assessment structures",
          assessmentError,
        );
      }

      const attachInstructors = (course: Course) => ({
        ...course,
        assessmentStructure:
          assessmentStructures.get(course.id) || null,
        instructors: instructorsByCourse.get(course.id) || [],
      });

      setEnrolledCourses(myCourses.map(attachInstructors));
      setAvailableCourses(
        studyPlanResult.entries.map((entry, index) => {
          const offeredCourse = entry.courseCode
            ? offeringsByCode.get(entry.courseCode)
            : null;

          if (offeredCourse) {
            return attachInstructors({
              ...offeredCourse,
              isOffered: true,
              isEnrolled: enrolledCourseIds.has(offeredCourse.id),
              isPlaceholder: false,
              studyPlanEntry: entry,
            });
          }

          return {
            id: `study-plan-${entry.programmeKey}-${entry.intakeYear}${entry.intakeSemester}-${entry.termCode}-${entry.planCourseKey}-${index}`,
            template_id: "",
            course_code: entry.courseCode || "Requirement",
            code: entry.courseCode || "Requirement",
            name: entry.courseName,
            chinese_name: null,
            faculty: profileFaculty || "",
            programme: profileProgramme || "",
            course_type: "elective_open",
            credits: entry.creditHours || 0,
            credit_hours: entry.creditHours || 0,
            max_capacity: 0,
            enrollment_key: null,
            status: "unavailable",
            semester: resolvedTerm?.code || entry.termCode,
            created_at: "",
            isOffered: false,
            isEnrolled: false,
            isPlaceholder: entry.isPlaceholder,
            studyPlanEntry: entry,
            instructors: [],
          } satisfies Course;
        }),
      );
    } catch (error) {
      console.error(
        "Error fetching courses",
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [profileEmail, profileFaculty, profileId, profileProgramme]);

  // --- 1. Initial Load & Checks ---
  useEffect(() => {
    if (!profileId) return;
    if (!profileFaculty || !profileProgramme) {
      setShowProfileSetup(true);
      fetchProgrammeOptions();
    } else {
      void fetchData();
    }
  }, [fetchData, profileFaculty, profileId, profileProgramme]);

  useEffect(() => {
    if (!profileId || profileRole !== "student") return;

    const refreshCourses = () => {
      if (document.visibilityState === "visible") {
        invalidateCourseCache({ userId: profileId });
        void fetchData();
      }
    };

    const unsubscribe = subscribeToPrivateBroadcast({
      topic: `user:${profileId}:enrollments`,
      onMessage: () => {
        invalidateCourseCache({ userId: profileId });
        void fetchData();
      },
    });

    window.addEventListener("focus", refreshCourses);
    document.addEventListener("visibilitychange", refreshCourses);

    return () => {
      window.removeEventListener("focus", refreshCourses);
      document.removeEventListener("visibilitychange", refreshCourses);
      unsubscribe();
    };
  }, [fetchData, profileId, profileRole]);

  // --- 3. Actions ---

  const handleProfileSave = async () => {
    if (!selectedProgrammeObj) return;
    setIsSavingProfile(true);
    setProfileSetupError("");
    
    const { error } = await updateProfile({
      faculty: selectedProgrammeObj.faculty,
      programme: selectedProgrammeObj.programme
    });

    if (!error) {
      setShowProfileSetup(false);
      fetchData();
    } else {
      setProfileSetupError(getErrorMessage(error, "Failed to save programme selection."));
    }
    setIsSavingProfile(false);
  };

  const handleEnrollClick = (course: Course) => {
    setEnrollmentError("");
    setEnrollmentKeyInput("");
    setSelectedCourseForEnrollment(course);
  };

  const handleEnrollSubmit = async () => {
    if (!selectedCourseForEnrollment || !profile) return;
    setIsEnrolling(true);
    setEnrollmentError("");

    try {
      try {
        await enrollStudentInCourseWithKey({
          courseId: selectedCourseForEnrollment.id,
          enrollmentKey: enrollmentKeyInput.trim(),
        });
      } catch (error) {
        if (
          error
          && typeof error === "object"
          && "code" in error
          && error.code === "23505"
        ) {
          throw new Error("Already enrolled.", { cause: error });
        }
        throw error;
      }

      invalidateCourseCache({
        courseId: selectedCourseForEnrollment.id,
        userId: profile.id,
      });
      setSelectedCourseForEnrollment(null);
      setActiveTab("my-courses");
      setCurrentPage(1);
      void fetchData();
      
    } catch (error: unknown) {
      setEnrollmentError(getErrorMessage(error, "Failed to enroll"));
    } finally {
      setIsEnrolling(false);
    }
  };

  const getCourseCode = (course: Course) => course.course_code || course.code || "N/A";
  const getLecturerNames = (course: Course) => {
    if (!course.instructors?.length) return "No lecturer assigned yet";
    return course.instructors.map((instructor) => instructor.full_name).join(", ");
  };
  const hasAssignedLecturer = (course: Course) => Boolean(course.instructors?.length);
  const formatAssessmentPercent = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(1);

  const CompactAssessmentSummary = ({
    structure,
  }: {
    structure?: ReturnType<typeof assessmentRowsToValues> | null;
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
          .join(" 璺?")}
      </p>
    );
  };

  const filteredAvailableCourses = useMemo(() => {
    const search = debouncedSearchTerm.toLowerCase();
    if (!search) return availableCourses;
    return availableCourses.filter(course =>
      course.name.toLowerCase().includes(search)
      || getCourseCode(course).toLowerCase().includes(search)
      || (course.studyPlanEntry?.category || "").toLowerCase().includes(search),
    );
  }, [availableCourses, debouncedSearchTerm]);
  const totalPages = Math.ceil(filteredAvailableCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = filteredAvailableCourses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const filteredProgrammes = programmeOptions.filter(p => 
    p.programme.toLowerCase().includes(programmeSearch.toLowerCase())
  );

  // --- 4. Render Logic ---

  // Keep this return after all hooks. If it runs before useMemo/useEffect hooks,
  // React sees a different hook count when switching between the list and CoursePage.
  if (viewingCourseId) {
    return <CoursePage courseId={viewingCourseId} onBack={() => {
      setViewingCourseId(null);
      // Clear URL params when going back
      navigate('/courses', { replace: true });
    }} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Studies</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {profile?.programme || "Manage your courses"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:w-auto">
          <TabsTrigger value="my-courses" className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <BookOpen className="h-4 w-4" />
            Enrolled
            <Badge variant="secondary" className="ml-1">{enrolledCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Search className="h-4 w-4" />
            Browse Available
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: MY COURSES --- */}
        <TabsContent value="my-courses" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : enrolledCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Start your semester by enrolling in courses.</p>
              <Button onClick={() => setActiveTab("browse")}>Browse Available Courses</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {enrolledCourses.map(course => (
                <Card 
                    key={course.id} 
                    className="hover:shadow-md transition-all border-l-4 border-l-green-500 cursor-pointer"
                    onClick={() => setViewingCourseId(course.id)} // Click card to open
                >
                  <CardHeader className="p-3 pb-2 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{getCourseCode(course)}</Badge>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Enrolled</Badge>
                    </div>
                    <CardTitle className="mt-2 line-clamp-2 text-base sm:text-lg">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs sm:text-sm">{course.chinese_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                     <div className="mb-2 space-y-1.5 text-xs text-muted-foreground sm:mb-4 sm:space-y-2">
                        <div className="flex items-center gap-2">
                           <Clock className="h-3 w-3" /> {course.credit_hours} Credits
                        </div>
                        <div className="flex items-center gap-2">
                           <Users className="h-3 w-3" /> {course.faculty}
                        </div>
                        <div className="flex items-center gap-2">
                           <GraduationCap className="h-3 w-3" /> Lecturer: {getLecturerNames(course)}
                        </div>
                     </div>
                     <div className="mb-3 sm:mb-4">
                       <div className="sm:hidden">
                         <CompactAssessmentSummary
                           structure={
                             course.assessmentStructure
                               ? assessmentRowsToValues(
                                   course.assessmentStructure,
                                 )
                               : null
                           }
                         />
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="mt-2 h-8 rounded-full px-3 text-xs"
                           onClick={event => {
                             event.stopPropagation();
                             setAssessmentCourseToView(course);
                           }}
                         >
                           <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                           View Assessment
                         </Button>
                       </div>
                       <div className="hidden sm:block">
                         <CourseAssessmentSummary
                           structure={
                             course.assessmentStructure
                               ? assessmentRowsToValues(
                                   course.assessmentStructure,
                                 )
                               : null
                           }
                         />
                       </div>
                     </div>
                     <Button className="w-full" onClick={(e: React.MouseEvent) => {
                         e.stopPropagation(); // Prevent double triggering
                         setViewingCourseId(course.id);
                     }}>
                        Go to Course <ArrowRightCircle className="ml-2 h-4 w-4" />
                     </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- TAB: BROWSE (With Pagination) --- */}
        <TabsContent value="browse" className="space-y-4 sm:space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search available courses..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid min-h-[400px] grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {studyPlanMessage && (
              <Alert className="col-span-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{studyPlanMessage}</AlertDescription>
              </Alert>
            )}
            {paginatedCourses.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center text-muted-foreground">
                {studyPlanMessage || "No study plan courses found for this semester."}
              </div>
            )}
            {paginatedCourses.map(course => (
              <Card key={course.id} className="flex min-h-44 flex-col hover:border-primary/50 transition-colors sm:min-h-0">
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-1.5">
                    <Badge variant="outline" className="px-1.5 text-[10px] sm:px-2.5 sm:text-xs">
                      {getCourseCode(course)}
                    </Badge>
                    <Badge
                      variant={course.isEnrolled || course.isOffered ? 'secondary' : 'outline'}
                      className="px-1.5 text-[10px] capitalize sm:px-2.5 sm:text-xs"
                    >
                      {course.isEnrolled
                        ? "Enrolled"
                        : course.isOffered
                          ? "Offered"
                        : course.isPlaceholder
                          ? "Requirement"
                          : "Not offered"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 line-clamp-3 text-sm leading-snug sm:line-clamp-1 sm:text-lg" title={course.name}>{course.name}</CardTitle>
                  <CardDescription className="font-noto-sans-sc line-clamp-1 text-xs sm:text-sm">
                    {course.studyPlanEntry?.category || course.chinese_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto p-3 pt-0 sm:p-6 sm:pt-0">
                   <div className="mb-3 space-y-2 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                      <div className="hidden items-center gap-2 sm:flex">
                        <GraduationCap className="h-4 w-4" />
                        <span>
                          {course.isOffered
                            ? `Lecturer: ${getLecturerNames(course)}`
                            : "Waiting for an active class"}
                        </span>
                      </div>
                      <div className="flex justify-end items-center">
                        <span>{course.credit_hours} Credits</span>
                      </div>
                   </div>
                   <Button
                     className="h-8 w-full px-2 text-xs sm:h-10 sm:text-sm"
                     onClick={() => handleEnrollClick(course)}
                     disabled={course.isEnrolled || !course.isOffered || !hasAssignedLecturer(course)}
                   >
                      <Plus className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                      {course.isEnrolled
                        ? "Already Enrolled"
                        : course.isOffered
                          ? "Enroll"
                        : course.isPlaceholder
                          ? "Requirement Only"
                          : "Not Offered Yet"}
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="min-w-24 text-center text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(assessmentCourseToView)}
        onOpenChange={open => {
          if (!open) setAssessmentCourseToView(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment Structure</DialogTitle>
            <DialogDescription>
              {assessmentCourseToView?.name || "Course assessment details"}
            </DialogDescription>
          </DialogHeader>
          <CourseAssessmentSummary
            structure={
              assessmentCourseToView?.assessmentStructure
                ? assessmentRowsToValues(
                    assessmentCourseToView.assessmentStructure,
                  )
                : null
            }
          />
        </DialogContent>
      </Dialog>

      {/* --- DIALOG: PROFILE SETUP --- */}
      <Dialog open={showProfileSetup} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" hideCloseButton onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Welcome! Select your Programme</DialogTitle>
            <DialogDescription>
              Please search and select your current study programme to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {!selectedLevel ? (
                // STEP 1: Select Level
                <div className="space-y-2">
                    <p className="text-sm font-medium mb-3">1. Select Level of Study</p>
                    <div className="grid grid-cols-1 gap-2">
                        {Array.from(new Set(programmeOptions.map(p => p.faculty || "Other"))).map(level => (
                            <button
                                key={level}
                                onClick={() => setSelectedLevel(level)}
                                className="w-full text-left px-4 py-3 text-sm rounded-md border bg-card hover:bg-accent transition-colors flex justify-between items-center"
                            >
                                <span>{level}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                // STEP 2: Select Programme
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedLevel(null); setSelectedProgrammeObj(null); setProgrammeSearch(""); setModalCurrentPage(1); }} className="h-8 px-2">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <span className="text-sm font-medium truncate">{selectedLevel}</span>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search programmes..." 
                            className="pl-8"
                            value={programmeSearch}
                            onChange={(e) => {
                                setProgrammeSearch(e.target.value);
                                setModalCurrentPage(1);
                            }}
                        />
                    </div>
                    
                    <div className="border rounded-md p-2 bg-muted/10 min-h-[280px] flex flex-col">
                        {(() => {
                            const levelProgrammes = filteredProgrammes.filter(p => p.faculty === selectedLevel);
                            const totalModalPages = Math.ceil(levelProgrammes.length / 5);
                            const paginatedLevelProgrammes = levelProgrammes.slice((modalCurrentPage - 1) * 5, modalCurrentPage * 5);

                            if (levelProgrammes.length === 0) {
                                return (
                                    <div className="h-full flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                        No programmes found.
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <div className="space-y-1 flex-1">
                                        {paginatedLevelProgrammes.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedProgrammeObj(opt)}
                                                className={`w-full text-left px-3 py-3 text-sm rounded-md transition-colors border ${
                                                    selectedProgrammeObj?.programme === opt.programme 
                                                    ? 'bg-primary text-primary-foreground border-primary' 
                                                    : 'bg-card hover:bg-accent border-transparent'
                                                }`}
                                            >
                                                {opt.programme}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {totalModalPages > 1 && (
                                        <div className="flex items-center justify-between pt-4 mt-auto border-t">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setModalCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={modalCurrentPage === 1}
                                                className="h-8"
                                            >
                                                <ChevronLeft className="h-4 w-4" /> Prev
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {modalCurrentPage} / {totalModalPages}
                                            </span>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setModalCurrentPage(p => Math.min(totalModalPages, p + 1))}
                                                disabled={modalCurrentPage === totalModalPages}
                                                className="h-8"
                                            >
                                                Next <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
            {profileSetupError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{profileSetupError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleProfileSave} disabled={!selectedProgrammeObj || isSavingProfile}>
              {isSavingProfile && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG: ENROLLMENT KEY --- */}
      <Dialog 
        open={!!selectedCourseForEnrollment} 
        onOpenChange={(open: boolean) => !open && setSelectedCourseForEnrollment(null)}
      >
        <DialogContent
          className="max-w-md"
          style={{ width: "min(calc(100vw - 2rem), 28rem)" }}
        >
          <DialogHeader>
            <DialogTitle>Enrollment Key Required</DialogTitle>
            <DialogDescription>
              To join <b>{selectedCourseForEnrollment?.name}</b>, enter the key provided by your lecturer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {enrollmentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{enrollmentError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Enrollment Key</Label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="e.g. AbC123Xy" 
                  className="pl-9 font-mono"
                  value={enrollmentKeyInput}
                  onChange={(e) => setEnrollmentKeyInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedCourseForEnrollment(null)}>Cancel</Button>
            <Button onClick={handleEnrollSubmit} disabled={isEnrolling || !enrollmentKeyInput}>
              {isEnrolling && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Enroll Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
