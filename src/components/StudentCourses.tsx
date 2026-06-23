import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { subscribeToPrivateBroadcast } from "@/lib/realtime";
import { PROGRAMMES } from "@/lib/programmes";
import {
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import {
  enrollStudentInCourseWithKey,
  getAvailableCourseOfferings,
  getCourseInstructorSummaries,
  getStudentCourseOfferings,
  invalidateCourseCache,
} from "@/data/courseRepository";
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

// --- Types ---
type Course = NormalizedCourseOffering & {
  instructors?: CourseInstructor[];
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
  const [availableCourseCount, setAvailableCourseCount] = useState(0);
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
  const [enrollmentKeyInput, setEnrollmentKeyInput] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Profile Setup State
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [selectedProgrammeObj, setSelectedProgrammeObj] = useState<{faculty: string, programme: string} | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState("");

  const profileId = profile?.id;
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
      const [myCourses, availablePage] = await Promise.all([
        getStudentCourseOfferings(profileId),
        getAvailableCourseOfferings({
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          searchTerm: debouncedSearchTerm,
        }),
      ]);
      setAvailableCourseCount(availablePage.totalCount);
      setAvailableCourses(availablePage.courses);

      let instructorRows = [];
      try {
        instructorRows =
          await getCourseInstructorSummaries(myCourses.map(course => course.id));
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

      const attachInstructors = (course: Course) => ({
        ...course,
        instructors: instructorsByCourse.get(course.id) || [],
      });

      setEnrolledCourses(myCourses.map(attachInstructors));
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
  }, [currentPage, debouncedSearchTerm, profileId]);

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

  // --- 4. Render Logic ---

  // *** IF VIEWING A COURSE, SHOW THE TEAMS VIEW ***
  if (viewingCourseId) {
    return <CoursePage courseId={viewingCourseId} onBack={() => {
      setViewingCourseId(null);
      // Clear URL params when going back
      navigate('/courses', { replace: true });
    }} />;
  }

  const totalPages = Math.ceil(availableCourseCount / ITEMS_PER_PAGE);
  const paginatedCourses = availableCourses;

  const filteredProgrammes = programmeOptions.filter(p => 
    p.programme.toLowerCase().includes(programmeSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Studies</h1>
        <p className="text-muted-foreground">
          {profile?.programme || "Manage your courses"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Enrolled
            <Badge variant="secondary" className="ml-1">{enrolledCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <Search className="h-4 w-4" />
            Browse Available
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: MY COURSES --- */}
        <TabsContent value="my-courses" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20 border-dashed">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Start your semester by enrolling in courses.</p>
              <Button onClick={() => setActiveTab("browse")}>Browse Courses</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map(course => (
                <Card 
                    key={course.id} 
                    className="hover:shadow-md transition-all border-l-4 border-l-green-500 cursor-pointer"
                    onClick={() => setViewingCourseId(course.id)} // Click card to open
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="outline">{getCourseCode(course)}</Badge>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Enrolled</Badge>
                    </div>
                    <CardTitle className="mt-2 line-clamp-1">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{course.chinese_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="text-xs text-muted-foreground space-y-2 mb-4">
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
        <TabsContent value="browse" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or code..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
            {paginatedCourses.map(course => (
              <Card key={course.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">{getCourseCode(course)}</Badge>
                    <Badge variant={course.course_type === 'common_core' ? 'secondary' : 'outline'}>
                      {course.course_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg line-clamp-1" title={course.name}>{course.name}</CardTitle>
                  <CardDescription className="font-noto-sans-sc line-clamp-1">{course.chinese_name}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                   <div className="space-y-3 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>Lecturer: {getLecturerNames(course)}</span>
                      </div>
                      <div className="flex justify-end items-center">
                        <span>{course.credit_hours} Credits</span>
                      </div>
                   </div>
                   <Button className="w-full" onClick={() => handleEnrollClick(course)} disabled={!hasAssignedLecturer(course)}>
                      <Plus className="h-4 w-4 mr-2" /> {hasAssignedLecturer(course) ? "Enroll" : "No Lecturer Assigned"}
                   </Button>
                </CardContent>
              </Card>
            ))}
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
