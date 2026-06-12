import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext"; // Fixed path
import { supabase } from "@/lib/supabase"; // Fixed path
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Calendar, CheckCircle, Clock, ChevronRight, FileText, Loader2, BookOpen, AlertCircle
} from "lucide-react";

export function Assignments() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data Buckets
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [pastDue, setPastDue] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [crucialCount, setCrucialCount] = useState(0);

  // Lecturer Buckets
  const [lecturerAll, setLecturerAll] = useState<any[]>([]);
  const [needsGrading, setNeedsGrading] = useState<any[]>([]);
  const [gradedAssignments, setGradedAssignments] = useState<any[]>([]);

  const isLecturer = profile?.role === 'lecturer';

  useEffect(() => {
    if (!user) return;
    if (isLecturer) {
      fetchLecturerAssignments();
    } else {
      fetchAssignments();
    }
  }, [user, isLecturer]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      const { data: enrollments, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', user?.id);

      if (enrollmentError) throw enrollmentError;

      const courseIds = Array.from(new Set((enrollments || []).map((row: any) => row.course_id).filter(Boolean)));

      if (courseIds.length === 0) {
        setUpcoming([]);
        setPastDue([]);
        setCompleted([]);
        setCrucialCount(0);
        return;
      }

      const { data: allAssignments, error } = await supabase
        .from('assignments')
        .select(`
          *,
          course_offerings(${COURSE_OFFERING_SELECT})
        `)
        .in('course_id', courseIds)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const { data: mySubmissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user?.id);

      const now = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(now.getDate() + 2);

      const upcomingTemp: any[] = [];
      const pastDueTemp: any[] = [];
      const completedTemp: any[] = [];
      let crucial = 0;

      allAssignments?.forEach((assignment: any) => {
        const assign = {
          ...assignment,
          courses: normalizeCourseOffering(assignment.course_offerings),
        };
        const submission = mySubmissions?.find(s => s.assignment_id === assign.id);
        const fullAssign = { ...assign, submission };
        const dueDate = new Date(assign.due_date);

        if (submission) {
          completedTemp.push(fullAssign);
        } else {
          if (dueDate < now) {
            pastDueTemp.push(fullAssign);
          } else {
            upcomingTemp.push(fullAssign);
            if (dueDate <= twoDaysFromNow) crucial++;
          }
        }
      });

      setUpcoming(upcomingTemp);
      setPastDue(pastDueTemp);
      setCompleted(completedTemp.sort((a, b) => new Date(b.submission?.submitted_at || 0).getTime() - new Date(a.submission?.submitted_at || 0).getTime()));
      setCrucialCount(crucial);

    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerAssignments = async () => {
    try {
      setLoading(true);

      const lecturerId = profile?.id || user?.id;
      const { data: teachingRows, error: teachingError } = await supabase
        .from('course_instructors')
        .select('course_id')
        .eq('user_id', lecturerId);

      if (teachingError) throw teachingError;

      const courseIds = Array.from(new Set((teachingRows || []).map((row: any) => row.course_id).filter(Boolean)));

      if (courseIds.length === 0) {
        setLecturerAll([]);
        setNeedsGrading([]);
        setGradedAssignments([]);
        return;
      }

      const { data: allAssign, error } = await supabase
        .from('assignments')
        .select(`*, course_offerings(${COURSE_OFFERING_SELECT})`)
        .in('course_id', courseIds)
        .order('due_date', { ascending: true });

      if (error) {
        console.error("Error fetching assignments:", error);
        return;
      }

      if (!allAssign || allAssign.length === 0) {
        setLecturerAll([]);
        setNeedsGrading([]);
        setGradedAssignments([]);
        return;
      }

      const assignmentIds = allAssign.map((a: any) => a.id);

      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('*')
        .in('assignment_id', assignmentIds);

      const byAssignment: Record<string, any[]> = {};
      (subs || []).forEach((s: any) => {
        if (!byAssignment[s.assignment_id]) byAssignment[s.assignment_id] = [];
        byAssignment[s.assignment_id].push(s);
      });

      const withMetrics = (allAssign || []).map((assignment: any) => {
        const a = {
          ...assignment,
          courses: normalizeCourseOffering(assignment.course_offerings),
        };
        const list = byAssignment[a.id] || [];
        const total = list.length;
        const ungraded = list.filter((x: any) => x.grade == null && x.submitted_at).length;
        const graded = list.filter((x: any) => x.grade != null).length;
        return { ...a, metrics: { totalSubmissions: total, ungradedCount: ungraded, gradedCount: graded } };
      });

      // Show new assignments (no submissions yet) in Needs Grading for visibility
      const needs = withMetrics.filter((a: any) => a.metrics.ungradedCount > 0 || a.metrics.totalSubmissions === 0);
      const gradedDone = withMetrics.filter((a: any) => a.metrics.totalSubmissions > 0 && a.metrics.ungradedCount === 0);

      setLecturerAll(withMetrics);
      setNeedsGrading(needs); // For demo, putting everything in 'Needs Grading' or 'All' is safer
      setGradedAssignments(gradedDone);
    } catch (error) {
      console.error('Error fetching lecturer assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (courseId: string, assignmentId: string) => {
    // Route to courses with query params so StudentCourses opens CoursePage
    navigate(`/courses?courseId=${courseId}&assignmentId=${assignmentId}`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const AssignmentCard = ({ item, type }: { item: any, type: 'upcoming' | 'pastDue' | 'completed' | 'needsGrading' | 'graded' | 'all' }) => {
    const isLate = type === 'pastDue';
    const dueDate = new Date(item.due_date);
    const dateString = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const isCrucial = (type === 'upcoming' || type === 'needsGrading') && dueDate <= new Date(new Date().setDate(new Date().getDate() + 2));
    const maxScore = item.max_score || item.points || 100;
    const courseCode = item.courses?.course_code || item.courses?.code || "N/A";

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md border-0 ring-1 ring-border group bg-card ${
            isCrucial ? 'ring-orange-200 bg-orange-50/30 dark:bg-orange-900/10 dark:ring-orange-900/50' : ''
        }`}
        onClick={() => handleCardClick(item.course_id, item.id)}
      >
        <CardContent className="p-6 flex items-center gap-6">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            type === 'completed' || type === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
            type === 'pastDue' || type === 'needsGrading' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {type === 'completed' || type === 'graded' ? <CheckCircle className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" /> 
                    {/* Defensive check in case course relation is missing */}
                    <span className="truncate max-w-[180px] sm:max-w-[260px]">{item.courses?.name || "Unknown Course"}</span>
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{courseCode}</Badge>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {item.submission?.grade != null && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 hover:bg-green-200 font-bold">
                            {item.submission.grade} / {maxScore}
                        </Badge>
                    )}
                    {isCrucial && <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Due Soon</Badge>}
                    {item.metrics && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Subs: {item.metrics.totalSubmissions}</Badge>
                        {item.metrics.ungradedCount > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none text-xs">Ungraded: {item.metrics.ungradedCount}</Badge>
                        )}
                        {item.metrics.totalSubmissions === 0 && (
                          <Badge variant="secondary" className="text-xs">Awaiting submissions</Badge>
                        )}
                      </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-4 mt-3 text-sm font-medium">
              <span className={`flex items-center gap-1.5 ${isLate ? 'text-red-700 dark:text-red-300' : isCrucial ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                    <Calendar className="h-4 w-4"/>
                {type === 'completed' && item.submission?.submitted_at ? `Submitted ${new Date(item.submission.submitted_at).toLocaleDateString()}` : `Due ${dateString}`}
                </span>
              <span className="text-muted-foreground">| {maxScore} Points</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Assignments</h1>
                <p className="text-muted-foreground mt-2 text-lg">{profile?.role === 'lecturer' ? 'Manage all course assignments.' : 'Track your upcoming tasks.'}</p>
            </div>
            {crucialCount > 0 && (
                <div className="hidden sm:flex items-center gap-2 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    {crucialCount} assignments due soon!
                </div>
            )}
        </div>

        <Tabs defaultValue={profile?.role === 'lecturer' ? 'needs-grading' : 'upcoming'} className="w-full">
          <TabsList className="mb-8 bg-card border border-border h-14 p-1 rounded-xl shadow-sm grid w-full" style={{gridTemplateColumns: profile?.role === 'lecturer' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))'}}>
            {profile?.role === 'lecturer' ? (
              <>
                <TabsTrigger 
                  value="needs-grading" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  Needs Grading {needsGrading.length > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0">{needsGrading.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger 
                  value="graded" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  Graded {gradedAssignments.length > 0 && <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-200 border-0">{gradedAssignments.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  All {lecturerAll.length > 0 && <Badge className="ml-2 bg-muted text-foreground border-0">{lecturerAll.length}</Badge>}
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger 
                  value="upcoming" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  Upcoming {upcoming.length > 0 && <Badge className="ml-2 bg-muted text-foreground border-0">{upcoming.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger 
                  value="past-due" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  Past Due {pastDue.length > 0 && <Badge className="ml-2 bg-red-100 text-red-700 hover:bg-red-200 border-0">{pastDue.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="font-semibold text-base rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  Completed {completed.length > 0 && <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-200 border-0">{completed.length}</Badge>}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {profile?.role === 'lecturer' ? (
            <>
              <TabsContent value="needs-grading" className="space-y-4">
                {needsGrading.length === 0 ? (
                  <EmptyState icon={<AlertCircle className="h-10 w-10 text-yellow-500" />} title="No ungraded submissions" desc="You're all caught up." />
                ) : (
                  needsGrading.map(item => <AssignmentCard key={item.id} item={item} type="needsGrading" />)
                )}
              </TabsContent>
              <TabsContent value="graded" className="space-y-4">
                {gradedAssignments.length === 0 ? (
                  <EmptyState icon={<CheckCircle className="h-10 w-10 text-green-500" />} title="No graded assignments yet" desc="Once graded, they'll appear here." />
                ) : (
                  gradedAssignments.map(item => <AssignmentCard key={item.id} item={item} type="graded" />)
                )}
              </TabsContent>
              <TabsContent value="all" className="space-y-4">
                {lecturerAll.length === 0 ? (
                  <EmptyState icon={<FileText className="h-10 w-10 text-muted-foreground" />} title="No assignments created" desc="Create assignments in your course page." />
                ) : (
                  lecturerAll.map(item => <AssignmentCard key={item.id} item={item} type="all" />)
                )}
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="upcoming" className="space-y-4">
                {upcoming.length === 0 ? (
                  <EmptyState icon={<CheckCircle className="h-10 w-10 text-blue-500" />} title="All caught up!" desc="No upcoming assignments." />
                ) : (
                    upcoming.map(item => <AssignmentCard key={item.id} item={item} type="upcoming" />)
                )}
              </TabsContent>
              <TabsContent value="past-due" className="space-y-4">
                {pastDue.length === 0 ? (
                  <EmptyState icon={<Clock className="h-10 w-10 text-green-500" />} title="No overdue work" desc="You're doing great!" />
                ) : (
                    pastDue.map(item => <AssignmentCard key={item.id} item={item} type="pastDue" />)
                )}
              </TabsContent>
              <TabsContent value="completed" className="space-y-4">
                {completed.length === 0 ? (
                  <EmptyState icon={<FileText className="h-10 w-10 text-muted-foreground" />} title="No completed work" desc="Submitted assignments appear here." />
                ) : (
                    completed.map(item => <AssignmentCard key={item.id} item={item} type="completed" />)
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="text-center py-24 bg-card rounded-2xl border-2 border-dashed border-border">
      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-lg text-foreground">{title}</h3>
      <p className="text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
