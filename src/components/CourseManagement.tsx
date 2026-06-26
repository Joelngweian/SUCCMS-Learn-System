import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase.ts";
import { useAuth } from "@/contexts/AuthContext.tsx";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
  removeCourseOfferingFiles,
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import type { Database } from "@/lib/database.types";
import { CoursePage } from "./CoursePage"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Search, Plus, Loader2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { confirmAction } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import { invalidateCourseCache } from "@/data/courseRepository";
import { CourseCreationRequestDialog } from "./course/CourseCreationRequestDialog";
import {
  assessmentRowsToValues,
  createCourseOfferingWithAssessment,
  getCourseAssessmentStructures,
  saveCourseAssessmentStructure,
  type CourseAssessmentItem,
  type CourseAssessmentValues,
} from "@/data/courseAssessmentRepository";
import {
  CourseAssessmentDialog,
  CourseAssessmentSummary,
} from "./course/CourseAssessmentStructure";

export function CourseManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("my-teaching");
  type CourseTemplate =
    Database["public"]["Functions"]["get_course_catalog_summary"]["Returns"][number];
  type TeachingCourse = NormalizedCourseOffering & {
    assessmentStructure?: CourseAssessmentItem[] | null;
  };
  const [courses, setCourses] = useState<CourseTemplate[]>([]);
  const [myCourses, setMyCourses] = useState<TeachingCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [droppingCourseId, setDroppingCourseId] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [courseToTeach, setCourseToTeach] = useState<CourseTemplate | null>(null);
  const [assessmentCourseToEdit, setAssessmentCourseToEdit] =
    useState<TeachingCourse | null>(null);
  
  // View Switching
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Pagination State (Same as Student View)
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  const profileId = profile?.id;

  // Open CoursePage directly when courseId is present in URL
  useEffect(() => {
    const urlCourseId = searchParams.get('courseId');
    if (urlCourseId && urlCourseId !== selectedCourseId) {
      setSelectedCourseId(urlCourseId);
    }
  }, [searchParams, selectedCourseId]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    // 1. Fetch lightweight course catalog fields only
    const { data: allData, error: catalogError } = await supabase.rpc(
      "get_course_catalog_summary",
    );
    if (catalogError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("courses")
        .select(
          "id, code, name, course_code, chinese_name, faculty, programme, course_type, credits, credit_hours, status",
        )
        .order("code");

      if (fallbackError) {
        notify.error(catalogError, "Failed to load course catalog.");
        setCourses([]);
      } else {
        setCourses((fallbackData || []) as CourseTemplate[]);
      }
    } else {
      setCourses(allData || []);
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
    setIsLoading(false);
  }, [profileId]);

  useEffect(() => {
    if (profileId) void fetchData();
  }, [fetchData, profileId]);

  const getCourseCode = (
    course: CourseTemplate | NormalizedCourseOffering,
  ) => course.course_code || course.code || "N/A";

  const handleClaimCourse = async (values: CourseAssessmentValues) => {
    if (!courseToTeach) return;

    await createCourseOfferingWithAssessment({
      courseTemplateId: courseToTeach.id,
      values,
    });
    invalidateCourseCache();
    setCourseToTeach(null);
    await fetchData();
    setActiveTab("my-teaching");
    notify.success("Course and assessment structure created.");
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

  // --- VIEW LOGIC ---

  if (selectedCourseId) {
    return <CoursePage courseId={selectedCourseId} onBack={() => { setSelectedCourseId(null); navigate('/courses', { replace: true }); }} />;
  }

  // Filter Logic
  const filteredAll = courses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    getCourseCode(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredAll.length / ITEMS_PER_PAGE);
  const paginatedCourses = filteredAll.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lecturer Dashboard</h1>
        <Button variant="outline" onClick={() => setIsRequestDialogOpen(true)}>
          Request New Course Creation
        </Button>
      </div>

      <CourseCreationRequestDialog
        open={isRequestDialogOpen}
        requesterId={profileId || null}
        onOpenChange={setIsRequestDialogOpen}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-teaching">My Teaching ({myCourses.length})</TabsTrigger>
          <TabsTrigger value="all-courses">Course Catalog</TabsTrigger>
        </TabsList>

        <div className="my-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search courses..." 
              className="pl-8" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* MY TEACHING TAB */}
        <TabsContent value="my-teaching" className="space-y-4">
          {myCourses.length === 0 && (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/30">
                <p className="text-muted-foreground">You haven't added any courses yet.</p>
                <Button variant="link" onClick={() => setActiveTab("all-courses")}>
                    Go to Course Catalog to add them
                </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCourses.map(course => (
              <Card 
                key={course.id} 
                className="hover:border-primary cursor-pointer transition-colors border-l-4 border-l-blue-500" 
                onClick={() => setSelectedCourseId(course.id)}
              >
                <CardHeader>
                  <div className="flex justify-between">
                    <Badge variant="outline">{getCourseCode(course)}</Badge>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">Teaching</Badge>
                  </div>
                  <CardTitle className="mt-2 line-clamp-1">{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    {course.faculty}
                  </div>
                  <CourseAssessmentSummary
                    structure={
                      course.assessmentStructure
                        ? assessmentRowsToValues(course.assessmentStructure)
                        : null
                    }
                  />
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1">Manage Course</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={event => {
                        event.stopPropagation();
                        setAssessmentCourseToEdit(course);
                      }}
                    >
                      Assessment
                    </Button>
                    {course.owner_id === profile?.id && (
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={droppingCourseId === course.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDropCourse(course);
                        }}
                      >
                        {droppingCourseId === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Drop Course</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ALL COURSES TAB (With Pagination) */}
        <TabsContent value="all-courses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {paginatedCourses.map(course => {
               const isAlreadyTeaching = myCourses.some(m => m.template_id === course.id);
               return (
                <Card key={course.id}>
                  <CardHeader>
                    <Badge variant="outline" className="w-fit">{getCourseCode(course)}</Badge>
                    <CardTitle className="mt-2 text-lg line-clamp-1">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{course.chinese_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isAlreadyTeaching ? (
                      <Button variant="secondary" className="w-full" disabled>Already Added</Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setCourseToTeach(course)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Teach this Course
                      </Button>
                    )}
                  </CardContent>
                </Card>
               );
             })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
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

      <CourseAssessmentDialog
        open={Boolean(courseToTeach)}
        onOpenChange={open => {
          if (!open) setCourseToTeach(null);
        }}
        courseName={courseToTeach?.name || "Course"}
        mode="create"
        onSubmit={handleClaimCourse}
      />

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
