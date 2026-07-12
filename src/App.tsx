import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/lib/supabase.ts"; // Added Supabase import
import {
  loadThemePreference,
  saveThemePreference,
} from "@/lib/themePreference";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { Login } from "./components/Login";
import { NotificationButton } from "./components/NotificationButton";
import { TopBarSearch } from "./components/TopBarSearch";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import {
  LayoutDashboard, BookOpen, MessageSquare, FileText, Trophy,
  Settings, HelpCircle, LogOut, Menu, X, Search, Moon, Sun,
  Shield, GraduationCap, UserCog, ClipboardList, BarChart3, UsersRound,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const StudentDashboard = lazy(() =>
  import("./components/StudentDashboard").then((module) => ({
    default: module.StudentDashboard,
  }))
);
const StudentCourses = lazy(() =>
  import("./components/StudentCourses").then((module) => ({
    default: module.StudentCourses,
  }))
);
const LecturerDashboard = lazy(() =>
  import("./components/LecturerDashboard").then((module) => ({
    default: module.LecturerDashboard,
  }))
);
const AdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  }))
);
const StaffDashboard = lazy(() =>
  import("./components/staff/AaroDashboardHome").then((module) => ({
    default: module.AaroDashboardHome,
  }))
);
const StaffAcademicPlanning = lazy(() =>
  import("./components/staff/StaffAcademicPlanning").then((module) => ({
    default: module.StaffAcademicPlanning,
  }))
);
const UserProfile = lazy(() =>
  import("./components/UserProfile").then((module) => ({
    default: module.UserProfile,
  }))
);
const CourseManagement = lazy(() =>
  import("./components/CourseManagement").then((module) => ({
    default: module.CourseManagement,
  }))
);
const Forum = lazy(() =>
  import("./components/Forum").then((module) => ({
    default: module.Forum,
  }))
);
const Assignments = lazy(() =>
  import("./components/Assignments").then((module) => ({
    default: module.Assignments,
  }))
);
const Gamification = lazy(() =>
  import("./components/Gamification").then((module) => ({
    default: module.Gamification,
  }))
);
const SettingsPage = lazy(() =>
  import("./components/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);
const HelpSupportPage = lazy(() =>
  import("./components/HelpSupportPage").then((module) => ({
    default: module.HelpSupportPage,
  }))
);
const LecturerAnalytics = lazy(() =>
  import("./components/LecturerAnalytics").then((module) => ({
    default: module.LecturerAnalytics,
  }))
);
const StudyGroupsPage = lazy(() =>
  import("./components/StudyGroupsPage").then((module) => ({
    default: module.StudyGroupsPage,
  }))
);

const PageLoadingFallback = () => (
  <div className="flex min-h-[420px] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
  </div>
);

// Types
type UserRole = 'student' | 'lecturer' | 'staff' | 'admin';

type NavigationItem = {
  id: string; // Used as the URL path
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
};

export default function App() {
  const { user, profile, isLoading, signOut } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); 
  
  // Local UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { onlineCount } = useOnlinePresence();
  
  // Notification State
  const [crucialCount, setCrucialCount] = useState(0);
  const themeRef = useRef(theme);
  const themeLoadRequestRef = useRef(0);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    const requestId = ++themeLoadRequestRef.current;
    const themeAtRequestStart = themeRef.current;

    const syncSavedTheme = async () => {
      try {
        const savedTheme = await loadThemePreference(userId);
        if (
          !cancelled &&
          requestId === themeLoadRequestRef.current &&
          themeRef.current === themeAtRequestStart &&
          savedTheme &&
          savedTheme !== themeRef.current
        ) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };

    void syncSavedTheme();

    return () => {
      cancelled = true;
    };
  }, [setTheme, user?.id]);

  // Derived State
  const userRole = (profile?.role as UserRole) || 'student';
  const isWideDashboard =
    (userRole === 'student' || userRole === 'lecturer') &&
    location.pathname === '/';
  
  const userData = profile ? {
    id: profile.id,
    name: profile.full_name || user?.email,
    program: profile.programme || 'General',
    department: profile.faculty || 'General',
    avatar: profile.avatar_url
  } : null;




  // --- CRUCIAL ASSIGNMENTS CHECKER ---
  useEffect(() => {
    const fetchCrucialStats = async () => {
      // Only run for students
      if (!user || userRole !== 'student') return;

      try {
        // 1. Get Enrolled Courses
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', user.id);

        if (!enrollments || enrollments.length === 0) return;
        const courseIds = enrollments.map(e => e.course_id);

        // 2. Find Assignments Due Soon (Next 48 Hours)
        const now = new Date();
        const twoDaysLater = new Date();
        twoDaysLater.setDate(now.getDate() + 2);

        const { data: assignments } = await supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds)
          .gt('due_date', now.toISOString())         // Due in future
          .lt('due_date', twoDaysLater.toISOString()); // But within 48h
        
        if (!assignments || assignments.length === 0) {
            setCrucialCount(0);
            return;
        }

        // 3. Filter out ones ALREADY submitted
        const assignmentIds = assignments.map(a => a.id);
        const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds);

        const submittedIds = new Set(submissions?.map(s => s.assignment_id));
        
        // Count only pending ones
        const pendingCount = assignments.filter(a => !submittedIds.has(a.id)).length;
        setCrucialCount(pendingCount);

      } catch (e) {
        console.error("Error fetching notification count", e);
      }
    };

    fetchCrucialStats();
  }, [user, userRole]); // Re-run if user changes

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (!user) return <Login />;

  // --- NAVIGATION CONFIG ---
  const studentNavigationItems: NavigationItem[] = [
    { id: '', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & AI insights' },
    { id: 'courses', label: 'My Courses', icon: BookOpen, description: 'Enrolled courses & materials' },
    { 
        id: 'assignments', 
        label: 'Assessments',
        icon: FileText,
        description: 'Submit & track assessments',
        badge: crucialCount > 0 ? crucialCount.toString() : undefined // Dynamic Badge
    },
    { id: 'forum', label: 'Discussions', icon: MessageSquare, description: 'Course discussions & Q&A' },
    { id: 'study-groups', label: 'Study Groups', icon: UsersRound, description: 'Study sessions & shared resources' },
    { id: 'progress', label: 'My Progress', icon: Trophy, description: 'Grades & peer benchmarking' }
  ];

  const lecturerNavigationItems: NavigationItem[] = [
    { id: '', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & AI insights' },
    { id: 'courses', label: 'Courses', icon: BookOpen, description: 'Manage course content' },
    { id: 'assignments', label: 'Assessments', icon: ClipboardList, description: 'Create & grade assessments' },
    { id: 'forum', label: 'Forums', icon: MessageSquare, description: 'Moderate discussions' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Student progress reports' }
  ];

  const staffNavigationItems: NavigationItem[] = [
    { id: '', label: 'AARO Dashboard', icon: LayoutDashboard, description: 'Stories & campus posts' },
    { id: 'study-plan-management', label: 'Study Plan Management', icon: ClipboardList, description: 'Study plans & class assignment' }
  ];

  const adminNavigationItems: NavigationItem[] = [
    { id: '', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & AI insights' }
  ];

  const navigationItems =
    userRole === 'student'
      ? studentNavigationItems
      : userRole === 'lecturer'
        ? lecturerNavigationItems
        : userRole === 'staff'
          ? staffNavigationItems
          : adminNavigationItems;
  const isDarkMode = resolvedTheme === "dark";
  
  const isActive = (path: string) => {
    if (path === '') return location.pathname === '/';
    return location.pathname.startsWith('/' + path);
  };

  const handleLogout = async () => {
    await signOut();
    setSidebarOpen(false);
  };

  const toggleTheme = async () => {
    const nextTheme = isDarkMode ? "light" : "dark";
    themeLoadRequestRef.current += 1;
    themeRef.current = nextTheme;
    setTheme(nextTheme);

    if (!user) return;

    try {
      await saveThemePreference(user.id, nextTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const RoleIcon = userRole === 'student' ? GraduationCap : userRole === 'admin' ? Shield : UserCog;
  const roleLabel =
    userRole === 'student'
      ? 'Student'
      : userRole === 'lecturer'
        ? 'Lecturer'
        : userRole === 'staff'
          ? 'AARO Staff'
          : 'Admin';
  const collapseTextClass = sidebarCollapsed ? 'lg:hidden' : '';
  const collapsedCenterClass = sidebarCollapsed ? 'lg:justify-center lg:px-2' : '';

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <div className="flex min-h-screen min-w-0 overflow-x-clip">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-sidebar border-r border-sidebar-border transform transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:overflow-visible ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`relative p-6 border-b border-sidebar-border ${sidebarCollapsed ? 'lg:p-3' : ''}`}>
              <div className={`flex items-center justify-between ${sidebarCollapsed ? 'lg:flex-col lg:gap-2' : ''}`}>
                <div onClick={() => { navigate('/'); setSidebarOpen(false); }} className={`flex items-center gap-3 cursor-pointer ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
                  <div className={`w-28 sm:w-32 h-10 rounded-md flex-shrink-0 flex items-center justify-center p-1 bg-white border border-gray-200 shadow-md ${sidebarCollapsed ? 'lg:w-10' : ''}`}>
                    <img src="/suclogo.png" alt="SUC logo" className="h-full w-auto object-contain" />
                  </div>
                  <div className={`${collapseTextClass} min-w-0`}>
                    <h2 className="whitespace-nowrap text-sidebar-foreground">SUCCMS Learn</h2>
                    <p className="whitespace-nowrap text-xs text-sidebar-foreground/60">College LMS</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(current => !current)}
                  className="hidden lg:absolute lg:-right-3 lg:top-1/2 lg:z-10 lg:inline-flex lg:h-7 lg:w-7 lg:-translate-y-1/2 lg:rounded-full lg:border lg:border-sidebar-border lg:bg-background lg:p-0 lg:shadow-sm lg:hover:bg-accent"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* User Profile in Sidebar */}
            <button
              className={`p-4 border-b border-sidebar-border w-full text-left bg-transparent hover:bg-sidebar-accent/30 ${sidebarCollapsed ? 'lg:px-3' : ''}`}
              onClick={() => { navigate(`/profile/${user.id}`); setSidebarOpen(false); }}
              title={userData?.name || 'User'}
            >
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
                <Avatar className="h-10 w-10">
                    <AvatarImage src={userData?.avatar || ''} />
                    <AvatarFallback>{userData?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${collapseTextClass}`}>
                  <p className="text-sm text-sidebar-foreground font-medium truncate">{userData?.name || 'User'}</p>
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-3 w-3 text-sidebar-foreground/60" />
                    <span className="text-xs text-sidebar-foreground/60 truncate max-w-[80px]">{userData?.program}</span>
                    <Badge className="text-xs h-4 px-1">{roleLabel}</Badge>
                  </div>
                </div>
              </div>
            </button>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { navigate(`/${item.id}`); setSidebarOpen(false); }}
                      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${collapsedCenterClass} ${isActive(item.id) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {sidebarCollapsed && item.badge && (
                        <span className="absolute right-2 top-2 hidden h-2 w-2 rounded-full bg-red-500 lg:block" />
                      )}
                      <div className={`flex-1 ${collapseTextClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          {item.badge && <Badge className="text-xs h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">{item.badge}</Badge>}
                        </div>
                        <p className="text-xs text-sidebar-foreground/60">{item.description}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border space-y-2">
              <div className={`flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className={`text-xs text-green-700 ${collapseTextClass}`}>Campus Activity</span>
                </div>
                <Badge className={`bg-green-100 text-green-800 text-xs ${collapseTextClass}`}>{onlineCount} online</Badge>
              </div>
              <Button variant="ghost" className={`w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent ${collapsedCenterClass} ${location.pathname === '/settings' ? 'bg-sidebar-accent font-medium' : ''}`} onClick={() => { navigate('/settings'); setSidebarOpen(false); }} title="Settings">
                <Settings className={`h-4 w-4 ${sidebarCollapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} /> <span className={collapseTextClass}>Settings</span>
              </Button>
              <Button variant="ghost" className={`w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent ${collapsedCenterClass} ${location.pathname === '/help' ? 'bg-sidebar-accent font-medium' : ''}`} onClick={() => { navigate('/help'); setSidebarOpen(false); }} title="Help & Support">
                <HelpCircle className={`h-4 w-4 ${sidebarCollapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} /> <span className={collapseTextClass}>Help & Support</span>
              </Button>
              <Button variant="ghost" className={`w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent ${collapsedCenterClass}`} onClick={handleLogout} title="Sign Out">
                <LogOut className={`h-4 w-4 ${sidebarCollapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} /> <span className={collapseTextClass}>Sign Out</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}

        <div className="min-w-0 flex-1 overflow-x-hidden lg:ml-0">
          <header className="bg-background border-b sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></Button>
                <TopBarSearch />
              </div>

              <div className="flex items-center gap-3">
                <NotificationButton />
                <Button variant="ghost" size="sm" onClick={toggleTheme}>{isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground"><span className="truncate max-w-[150px]">{userData?.name}</span></div>
                <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate(`/profile/${user.id}`)}>
                  <AvatarImage src={userData?.avatar || ''} />
                  <AvatarFallback>{userData?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main
            className={`mx-auto w-full min-w-0 p-4 sm:p-6 lg:p-8 ${
          isWideDashboard ? 'max-w-[1600px]' : 'max-w-7xl'
            }`}
          >
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Common Routes */}
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<HelpSupportPage />} />

                {/* Student Routes */}
                {userRole === 'student' && (
                  <>
                    <Route path="/" element={<StudentDashboard />} />
                    <Route path="/courses" element={<StudentCourses />} />
                    <Route path="/assignments" element={<Assignments />} />
                    <Route path="/forum" element={<Forum />} />
                    <Route path="/study-groups" element={<StudyGroupsPage />} />
                    <Route path="/progress" element={<Gamification />} />
                  </>
                )}

                {/* Lecturer Routes */}
                {userRole === 'lecturer' && (
                  <>
                    <Route path="/" element={<LecturerDashboard />} />
                    <Route path="/courses" element={<CourseManagement />} />
                    <Route path="/assignments" element={<Assignments />} />
                    <Route path="/forum" element={<Forum />} />
                    <Route path="/analytics" element={<LecturerAnalytics />} />
                  </>
                )}

                {/* Staff Routes */}
                {userRole === 'staff' && (
                  <>
                    <Route path="/" element={<StaffDashboard />} />
                    <Route path="/study-plan-management" element={<StaffAcademicPlanning />} />
                    <Route path="/academic-planning" element={<Navigate to="/study-plan-management" replace />} />
                  </>
                )}

                {/* Admin Routes */}
                {userRole === 'admin' && (
                  <Route path="/" element={<AdminDashboard />} />
                )}

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
