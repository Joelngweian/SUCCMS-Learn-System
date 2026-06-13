import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/lib/supabase.ts";
import type { Json } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext.tsx";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { 
  MessageSquare, FileText, Calendar, Users, Plus, 
  Trash2, Key, Loader2, Folder, 
  File, FileCode, FileImage, FileSpreadsheet, ChevronRight, ChevronDown, Upload,
  ArrowLeft, Paperclip, CheckCircle, X, Download, Sparkles, User, ChevronLeft, GraduationCap,
  MoreVertical, Edit, UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

interface CoursePageProps {
  courseId: string;
  onBack: () => void;
}

type AiGradeDetails = {
  confidence: number | null;
  criteria: Array<{
    name: string;
    score: number;
    maxScore: number;
    reason: string;
  }>;
  warnings: string[];
};

type SubmissionFile = {
  name: string;
  path: string;
};

const getSubmissionFiles = (value: Json | null): SubmissionFile[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((file): file is SubmissionFile => {
    if (!file || Array.isArray(file) || typeof file !== "object") return false;
    return typeof file.name === "string" && typeof file.path === "string";
  });
};

const getFileIcon = (type: string) => {
  if (type === 'folder') return <Folder className="h-6 w-6 text-blue-500 fill-blue-100" />;
  if (type.includes('image')) return <FileImage className="h-6 w-6 text-purple-500" />;
  if (type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
  if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
  if (type.includes('code') || type.includes('tsx') || type.includes('java')) return <FileCode className="h-6 w-6 text-yellow-500" />;
  return <File className="h-6 w-6 text-gray-500" />;
};

const getAssignmentMaxScore = (assignment: any) => {
  const value = Number(assignment?.max_score ?? assignment?.points ?? 100);
  return Number.isFinite(value) && value > 0 ? value : 100;
};

const getFunctionErrorMessage = async (error: any, fallback: string) => {
  try {
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      const payload = await response.clone().json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    }
  } catch {
    // Fall back to the invoke error message.
  }

  return error?.message || fallback;
};

export function CoursePage({ courseId, onBack }: CoursePageProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams(); 
  
  const [activeTab, setActiveTab] = useState("posts");
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [posts, setPosts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]); 
  const [people, setPeople] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  // Grading State
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentFeedback, setCurrentFeedback] = useState("");
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [aiGradingError, setAiGradingError] = useState("");
  const [aiGradeDetails, setAiGradeDetails] = useState<AiGradeDetails | null>(null);

  // File Browser States
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);

  // Input States
  const [newPostContent, setNewPostContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [postFiles, setPostFiles] = useState<{name: string, path: string, url?: string, size?: number, type?: string}[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostFiles, setEditPostFiles] = useState<{name: string, path: string, url?: string, size?: number, type?: string}[]>([]);

  // Mention States
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);

  // People States
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState("");

  
  // Dialog States
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showNewAssignmentDialog, setShowNewAssignmentDialog] = useState(false);
  const [newAssign, setNewAssign] = useState({ title: "", description: "", rubric: "", points: "", due_date: "" });
  const [newAssignFiles, setNewAssignFiles] = useState<{name: string, path: string, size?: number, type?: string}[]>([]);
  const [newRubricFiles, setNewRubricFiles] = useState<{name: string, path: string, size?: number, type?: string}[]>([]);

  // View Assignment State
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<SubmissionFile[]>([]);

  const isLecturer = profile?.role === 'lecturer';

  useEffect(() => {
    if (!courseId) return;
    fetchCourseDetails();
    fetchMaterials();
    fetchPeople(); 
    fetchAssignments();
    
    const channel = supabase
      .channel('public:course_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'course_posts', filter: `course_id=eq.${courseId}` }, (payload) => {
        setPosts((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  useEffect(() => {
    fetchMaterials();
  }, [currentFolderId]); 
  
  useEffect(() => {
    const assignmentIdFromUrl = searchParams.get('assignmentId');
    if (assignmentIdFromUrl && assignments.length > 0) {
        const targetAssign = assignments.find(a => a.id === assignmentIdFromUrl);
        if (targetAssign) {
            setSelectedAssignment(targetAssign);
            setActiveTab("assignments"); 
        }
    }
  }, [assignments, searchParams]);

  useEffect(() => {
    if (selectedAssignment) {
        if (isLecturer) {
            fetchSubmissionsForAssignment(selectedAssignment.id);
            setGradingStudentId(null); 
        } else if (user) {
            const fetchMyLatestSubmission = async () => {
                const { data } = await supabase
                    .from('assignment_submissions')
                    .select('*')
                    .eq('assignment_id', selectedAssignment.id)
                    .eq('student_id', user.id)
                    .single();
                
                if (data) {
                    setMySubmissions(prev => {
                        const others = prev.filter(s => s.assignment_id !== selectedAssignment.id);
                        return [...others, data];
                    });
                    setSubmissionFiles(getSubmissionFiles(data.files));
                }
            };
            fetchMyLatestSubmission();
        }
    }
  }, [selectedAssignment, isLecturer, user]);

  useEffect(() => {
    if (gradingStudentId && allSubmissions.length > 0) {
        const sub = allSubmissions.find(s => s.student_id === gradingStudentId);
        setCurrentGrade(sub?.grade != null ? String(sub.grade) : "");
        setCurrentFeedback(sub?.feedback || "");
        setAiGradingError("");
        setAiGradeDetails(null);
    }
  }, [gradingStudentId, allSubmissions]);

  const fetchCourseDetails = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('course_offerings')
      .select(COURSE_OFFERING_SELECT)
      .eq('id', courseId)
      .single();
    setCourse(data ? normalizeCourseOffering(data) : null);
    
    const { data: postData } = await supabase.from('course_posts').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
    setPosts(postData || []);
    setIsLoading(false);
  };

  const fetchMaterials = async () => {
    let query = supabase.from('course_materials').select('*').eq('course_id', courseId).order('file_type', { ascending: false }).order('title', { ascending: true });
    if (currentFolderId) query = query.eq('parent_id', currentFolderId);
    else query = query.is('parent_id', null);
    const { data } = await query;
    setMaterials(data || []);
  };

  const fetchPeople = async () => {
    try {
        const { data: studentIds } = await supabase.from('course_enrollments').select('student_id').eq('course_id', courseId);
        const { data: instructorIds } = await supabase.from('course_instructors').select('user_id').eq('course_id', courseId);
        
        const allUserIds = [
            ...(studentIds?.map(x => x.student_id) || []),
            ...(instructorIds?.map(x => x.user_id) || [])
        ];
        
        if (allUserIds.length === 0) {
            setPeople([]);
            return;
        }

        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('*')
            .in('id', allUserIds);

        setPeople(profiles || []);

    } catch (error) {
        console.error("Error fetching people:", error);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
        setAddStudentSearchQuery("");
        const { data: studentIds } = await supabase.from('course_enrollments').select('student_id').eq('course_id', courseId);
        const enrolledIds = studentIds?.map(x => x.student_id) || [];
        
        let query = supabase.from('user_profiles').select('*').eq('role', 'student');
        if (enrolledIds.length > 0) {
            query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
        }
        
        const { data } = await query;
        setAvailableStudents(data || []);
    } catch (error) {
        console.error("Error fetching available students:", error);
    }
  };

  const handleAddStudent = async (studentId: string) => {
      await supabase.from('course_enrollments').insert({
          course_id: courseId,
          student_id: studentId
      });
      fetchPeople();
      setShowAddStudentDialog(false);
  };

  const handleRemoveStudent = async (e: React.MouseEvent, studentId: string) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to remove this student from the course?")) return;
      await supabase.from('course_enrollments').delete().match({ course_id: courseId, student_id: studentId });
      fetchPeople();
  };

  const fetchAssignments = async () => {
    const { data: assignData } = await supabase.from('assignments').select('*').eq('course_id', courseId).order('due_date', { ascending: true });
    setAssignments(assignData || []);

    if (!isLecturer && user) {
        const { data: subData } = await supabase.from('assignment_submissions').select('*').eq('student_id', user.id);
        setMySubmissions(subData || []);
    }
  };

  const fetchSubmissionsForAssignment = async (assignId: string) => {
    const { data } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', assignId);
    setAllSubmissions(data || []);
  };

  const handleCreateAssignment = async () => {
    if (!newAssign.title || !newAssign.due_date) return;
    
    const { error } = await supabase.from('assignments').insert({
        course_id: courseId,
        title: newAssign.title,
        description: newAssign.description,
        rubric: newRubricFiles.length > 0 ? JSON.stringify(newRubricFiles) : null,
        max_score: newAssign.points ? parseInt(newAssign.points) : null,
        due_date: new Date(newAssign.due_date).toISOString(),
        attachments: newAssignFiles,
        created_by: user?.id
    });

    if (error) {
        console.error("Error creating assignment:", error);
        alert(`Failed to create assignment: ${error.message || JSON.stringify(error)}`);
    } else {
        setShowNewAssignmentDialog(false);
        setNewAssign({ title: "", description: "", rubric: "", points: "", due_date: "" });
        setNewAssignFiles([]);
        setNewRubricFiles([]);
        fetchAssignments();
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if(!confirm("Delete assignment?")) return;
    await supabase.from('assignments').delete().eq('id', id);
    fetchAssignments();
  };

  const handleTurnIn = async () => {
    if (!selectedAssignment || !user) return;
    
    const submissionData = { 
        assignment_id: selectedAssignment.id, 
        student_id: user.id, 
        files: submissionFiles, 
        submitted_at: new Date().toISOString() 
    };

    const existing = mySubmissions.find(s => s.assignment_id === selectedAssignment.id);
    let error;

    if (existing) {
        const { error: updateError } = await supabase.from('assignment_submissions').update(submissionData).eq('id', existing.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('assignment_submissions').insert(submissionData);
        error = insertError;
    }

    if (!error) {
        setMySubmissions(prev => {
            const others = prev.filter(s => s.assignment_id !== selectedAssignment.id);
            return [...others, { ...submissionData, id: existing?.id || 'temp-id', grade: null }];
        });
    } else {
        alert("Failed to turn in assignment. Please try again.");
    }
  };

  const handleUndoTurnIn = async () => {
    if (!selectedAssignment || !user) return;
    
    const { error } = await supabase.from('assignment_submissions').delete().eq('assignment_id', selectedAssignment.id).eq('student_id', user.id);
    
    if (!error) {
        setMySubmissions(prev => prev.filter(s => s.assignment_id !== selectedAssignment.id));
        setSubmissionFiles([]); 
    }
  };

  const handleSaveGrade = async () => {
    if (!gradingStudentId || !selectedAssignment) return;
    const maxScore = getAssignmentMaxScore(selectedAssignment);
    const numericGrade = Number(currentGrade);

    if (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > maxScore) {
        alert(`Enter a grade between 0 and ${maxScore}.`);
        return;
    }

    const existingSub = allSubmissions.find(s => s.student_id === gradingStudentId);
    let error;
    
    if (existingSub) {
        const result = await supabase.from('assignment_submissions').update({
            grade: Math.round(numericGrade),
            feedback: currentFeedback
        }).eq('id', existingSub.id);
        error = result.error;
    } else {
        const result = await supabase.from('assignment_submissions').insert({
            assignment_id: selectedAssignment.id,
            student_id: gradingStudentId,
            grade: Math.round(numericGrade),
            feedback: currentFeedback,
            submitted_at: new Date().toISOString()
        });
        error = result.error;
    }

    if (error) {
        alert(`Failed to save grade: ${error.message}`);
        return;
    }
    
    alert("Grade Saved!");
    fetchSubmissionsForAssignment(selectedAssignment.id); 
  };

  const handleAiAutoGrade = async () => {
    if (!selectedAssignment || !gradingStudentId) return;

    const submission = allSubmissions.find(
        item => item.student_id === gradingStudentId
    );
    if (!submission) {
        alert("This student has not submitted the assignment yet.");
        return;
    }
    if (!selectedAssignment.rubric) {
        alert("Add a grading rubric before using AI grading.");
        return;
    }

    setAiGradingError("");
    setAiGradeDetails(null);
    setIsAiGrading(true);
    try {
        const { data, error } = await supabase.functions.invoke("ai-grade-assignment", {
            body: {
                assignmentId: selectedAssignment.id,
                studentId: gradingStudentId
            }
        });

        if (error) {
            throw new Error(
                await getFunctionErrorMessage(
                    error,
                    "The AI grading service could not be reached."
                )
            );
        }
        if (data?.error) {
            throw new Error(data.error);
        }

        const maxScore = getAssignmentMaxScore(selectedAssignment);
        const suggestedScore = Number(data?.suggestedScore);
        if (!Number.isFinite(suggestedScore)) {
            throw new Error("The AI grading service returned an invalid score.");
        }

        const criteria = Array.isArray(data?.criteria)
            ? data.criteria
                .filter((criterion: any) => criterion?.name)
                .map((criterion: any) => {
                    const score = Number(criterion?.score);
                    const criterionMax = Number(criterion?.maxScore);
                    return {
                        name: String(criterion.name),
                        score: Number.isFinite(score) ? score : 0,
                        maxScore: Number.isFinite(criterionMax) ? criterionMax : 0,
                        reason: criterion.reason ? String(criterion.reason) : ""
                    };
                })
            : [];
        const warnings = Array.isArray(data?.warnings)
            ? data.warnings.filter(Boolean).map((warning: string) => String(warning))
            : [];
        const confidence = Number(data?.confidence);

        setCurrentGrade(
            Math.min(maxScore, Math.max(0, Math.round(suggestedScore))).toString()
        );
        setCurrentFeedback(
            data?.feedback || "No written feedback was generated."
        );
        setAiGradeDetails({
            confidence: Number.isFinite(confidence) ? Math.round(confidence) : null,
            criteria,
            warnings
        });
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "AI grading failed. Please try again.";
        const friendlyMessage = message.toLowerCase().includes("high demand")
            ? "Gemini is currently busy. No grade was changed. Please try again in a moment."
            : message;
        setAiGradingError(friendlyMessage);
    } finally {
        setIsAiGrading(false);
    }
  };

  const uploadTempFile = async (e: React.ChangeEvent<HTMLInputElement>, setList: Function, currentList: any[]) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const filePath = `${courseId}/assignments/${Math.random().toString(36).substring(2)}_${file.name}`;
    setIsUploading(true);
    const { error } = await supabase.storage.from('course_content').upload(filePath, file);
    setIsUploading(false);
    if (!error) {
        const { data } = supabase.storage.from('course_content').getPublicUrl(filePath);
        setList([...currentList, { name: file.name, path: data.publicUrl }]);
    }
  };

  const handlePostUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const uploadedFiles: typeof postFiles = [];

    for (const file of files) {
        const filePath = `${courseId}/posts/${Math.random().toString(36).substring(2)}_${file.name}`;
        const { error } = await supabase.storage.from('course_content').upload(filePath, file);
        if (!error) {
            const { data } = supabase.storage.from('course_content').getPublicUrl(filePath);
            uploadedFiles.push({ name: file.name, path: filePath, url: data.publicUrl, size: file.size, type: file.type });
        }
    }
    setPostFiles(prev => [...prev, ...uploadedFiles]);
    setIsUploading(false);
  };

  const handlePost = async () => {
    if (!newPostContent.trim() && postFiles.length === 0) return;
    
    await supabase.from('course_posts').insert({
        course_id: courseId,
        author_id: user?.id,
        author_name: profile?.full_name || "Unknown",
        content: newPostContent,
        attachments: postFiles
    });
    
    setNewPostContent("");
    setPostFiles([]);
    const { data } = await supabase.from('course_posts').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
    if(data) setPosts(data);
  };

  const handleEditPostSave = async () => {
      if (!editingPostId) return;
      if (!editPostContent.trim() && editPostFiles.length === 0) return;

      await supabase.from('course_posts').update({
          content: editPostContent,
          attachments: editPostFiles,
          updated_at: new Date().toISOString()
      }).eq('id', editingPostId);

      setEditingPostId(null);
      const { data } = await supabase.from('course_posts').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
      if(data) setPosts(data);
  };

  const handleEditPostUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const uploadedFiles: typeof editPostFiles = [];

    for (const file of files) {
        const filePath = `${courseId}/posts/${Math.random().toString(36).substring(2)}_${file.name}`;
        const { error } = await supabase.storage.from('course_content').upload(filePath, file);
        if (!error) {
            const { data } = supabase.storage.from('course_content').getPublicUrl(filePath);
            uploadedFiles.push({ name: file.name, path: filePath, url: data.publicUrl, size: file.size, type: file.type });
        }
    }
    setEditPostFiles(prev => [...prev, ...uploadedFiles]);
    setIsUploading(false);
  };

  const handleDeletePost = async (postId: string, attachments: any[]) => {
      if(!confirm("Delete this post?")) return;
      if (attachments && attachments.length > 0) {
          const paths = attachments.map(a => a.path);
          await supabase.storage.from('course_content').remove(paths);
      }
      await supabase.from('course_posts').delete().eq('id', postId);
      setPosts(posts.filter(p => p.id !== postId));
  };

  const startEditingPost = (post: any) => {
      setEditingPostId(post.id);
      setEditPostContent(post.content);
      setEditPostFiles(post.attachments || []);
  };

  const cancelEditingPost = () => {
      setEditingPostId(null);
      setEditPostContent("");
      setEditPostFiles([]);
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>, isEditing: boolean = false) => {
    const value = e.target.value;
    if (isEditing) setEditPostContent(value);
    else setNewPostContent(value);
    
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);
    
    if (match) {
        setMentionSearch(match[1].toLowerCase());
        setShowMentionDropdown(true);
        setMentionCursorIndex(match.index || 0);
    } else {
        setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
      const isEditing = editingPostId !== null;
      const content = isEditing ? editPostContent : newPostContent;
      const before = content.substring(0, mentionCursorIndex);
      const after = content.substring(mentionCursorIndex + mentionSearch.length + 1);
      
      if (isEditing) setEditPostContent(before + `@${name} ` + after);
      else setNewPostContent(before + `@${name} ` + after);
      
      setShowMentionDropdown(false);
  };

  const filteredMentions = [
      { id: 'everyone', name: 'everyone', role: 'all' },
      ...people.filter(p => p.full_name.toLowerCase().includes(mentionSearch))
  ];


  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await supabase.from('course_materials').insert({ course_id: courseId, parent_id: currentFolderId, title: newFolderName, file_type: 'folder', created_by: user?.id });
    setNewFolderName(""); setShowNewFolderDialog(false); fetchMaterials();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    
    const folderCache = new Map<string, string | null>();
    folderCache.set("", currentFolderId || null);

    for (const file of files) {
        let targetFolderId = currentFolderId || null;

        if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split('/');
            parts.pop(); 
            
            let currentPath = "";
            let parentId = currentFolderId || null;

            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                if (folderCache.has(currentPath)) {
                    parentId = folderCache.get(currentPath)!;
                } else {
                    const { data } = await supabase.from('course_materials')
                        .insert({ course_id: courseId, parent_id: parentId, title: part, file_type: 'folder', created_by: user?.id })
                        .select('id').single();
                    
                    if (data) {
                        folderCache.set(currentPath, data.id);
                        parentId = data.id;
                    }
                }
            }
            targetFolderId = parentId;
        }

        const ext = file.name.split('.').pop() || 'unknown';
        const filePath = `${courseId}/${Math.random().toString(36).substring(2)}.${ext}`;
        await supabase.storage.from('course_content').upload(filePath, file);
        await supabase.from('course_materials').insert({ 
            course_id: courseId, 
            parent_id: targetFolderId, 
            title: file.name, 
            file_path: filePath, 
            file_type: ext, 
            size: file.size, 
            created_by: user?.id 
        });
    }

    setIsUploading(false); 
    fetchMaterials();
    e.target.value = '';
  };

  const handleDeleteMaterial = async (e: React.MouseEvent, materialId: string) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this item?")) return;
      try {
          await supabase.from('course_materials').delete().eq('id', materialId);
          fetchMaterials();
      } catch (e) {
          console.error(e);
      }
  };

  const handleFileClick = (file: any) => {
    if (file.file_type === 'folder') { setCurrentFolderId(file.id); setFolderPath([...folderPath, { id: file.id, name: file.title }]); }
    else { const { data } = supabase.storage.from('course_content').getPublicUrl(file.file_path); window.open(data.publicUrl, '_blank'); }
  };

  if (isLoading || !course) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-primary">{course.name}</h1>
          <div className="flex gap-3 mt-2 text-muted-foreground">
             <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{course.course_code}</span>
             <span className="text-xs">•</span>
             <span className="text-xs">{course.semester || "General"}</span>
          </div>
        </div>
        {isLecturer && (
          <Card className="bg-yellow-50 border-yellow-200 min-w-[200px]">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4 text-yellow-700" />
                <span className="text-[10px] text-yellow-800 font-bold uppercase tracking-wider">Enrollment Key</span>
              </div>
              <p className="font-mono text-xl font-bold text-yellow-900 tracking-wide select-all">{course.enrollment_key || "NOT SET"}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 max-w-[500px] mb-4">
          <TabsTrigger value="posts" className="gap-2"><MessageSquare className="h-4 w-4"/> Posts</TabsTrigger>
          <TabsTrigger value="files" className="gap-2"><FileText className="h-4 w-4"/> Files</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2"><Calendar className="h-4 w-4"/> Tasks</TabsTrigger>
          <TabsTrigger value="people" className="gap-2"><Users className="h-4 w-4"/> People</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 flex-1">
          <div className="flex gap-4 p-4 border rounded-lg bg-muted/10 shadow-sm relative">
             <Avatar className="h-10 w-10 shrink-0">
                 <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                 <AvatarFallback>{profile?.full_name?.[0]}</AvatarFallback>
             </Avatar>
             <div className="flex-1 gap-2 flex flex-col relative">
                <Textarea 
                    placeholder="Share an announcement..." 
                    value={newPostContent} 
                    onChange={handlePostChange}
                    className="min-h-[80px]" 
                />
                
                <Popover open={showMentionDropdown} onOpenChange={setShowMentionDropdown}>
                    <PopoverTrigger asChild>
                        <div className="absolute top-10 left-0 w-1 h-1"></div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                        <div className="max-h-64 overflow-y-auto">
                            {filteredMentions.map(person => (
                                <div key={person.id} className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => insertMention(person.name || person.full_name)}>
                                    {person.id !== 'everyone' && (
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={person.avatar_url}/>
                                            <AvatarFallback>{(person.full_name || "U")[0]}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <span className="text-sm font-medium">{person.full_name || person.name}</span>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {postFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {postFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm border">
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setPostFiles(postFiles.filter((_, i) => i !== idx))}>
                                    <X className="h-3 w-3 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center mt-2">
                    <div>
                        <input type="file" id="post-file-upload" className="hidden" multiple onChange={handlePostUpload} disabled={isUploading} />
                        <Label htmlFor="post-file-upload" className="cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-foreground">
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            <span className="text-sm">Attach files</span>
                        </Label>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handlePost} disabled={(!newPostContent && postFiles.length === 0) || isUploading}>
                            Post
                        </Button>
                    </div>
                </div>
             </div>
          </div>
          <div className="space-y-4">
            {posts.map(post => {
              const author = people.find(p => p.id === post.author_id);
              return (
              <Card key={post.id} className="overflow-hidden">
                <div className="p-4 flex gap-3 relative">
                  <Avatar className="h-10 w-10 mt-1 shrink-0 border border-gray-200">
                      <AvatarImage src={author?.avatar_url || undefined} />
                      <AvatarFallback>{post.author_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {editingPostId === post.id ? (
                        <div className="flex flex-col gap-2">
                            <Textarea 
                                value={editPostContent} 
                                onChange={e => handlePostChange(e, true)}
                                className="min-h-[80px]" 
                            />
                            {editPostFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {editPostFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm border">
                                            <Paperclip className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setEditPostFiles(editPostFiles.filter((_, i) => i !== idx))}>
                                                <X className="h-3 w-3 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center mt-2">
                                <div>
                                    <input type="file" id={`edit-file-${post.id}`} className="hidden" multiple onChange={handleEditPostUpload} disabled={isUploading} />
                                    <Label htmlFor={`edit-file-${post.id}`} className="cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                        <span className="text-sm">Attach files</span>
                                    </Label>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={cancelEditingPost}>Cancel</Button>
                                    <Button size="sm" onClick={handleEditPostSave} disabled={(!editPostContent && editPostFiles.length === 0) || isUploading}>
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-semibold truncate text-gray-900">{post.author_name}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(post.created_at).toLocaleString()}</span>
                                    {(post.author_id === user?.id || isLecturer) && (
                                        <div className="flex items-center gap-1">
                                            {post.author_id === user?.id && (
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50" onClick={() => startEditingPost(post)}>
                                                    <Edit className="h-3 w-3 mr-1"/> Edit
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => handleDeletePost(post.id, post.attachments)}>
                                                <Trash2 className="h-3 w-3 mr-1"/> Delete
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap break-words text-gray-700">{post.content}</p>
                            
                            {post.attachments && post.attachments.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {post.attachments.filter((f: any) => f.type?.includes('image') || f.name?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)).length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {post.attachments.filter((f: any) => f.type?.includes('image') || f.name?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)).map((img: any, idx: number) => (
                                                <a key={idx} href={img.url || '#'} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-md border bg-muted">
                                                    <img src={img.url} alt={img.name} className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Download className="text-white h-6 w-6" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {post.attachments.filter((f: any) => !(f.type?.includes('image') || f.name?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))).length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {post.attachments.filter((f: any) => !(f.type?.includes('image') || f.name?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))).map((file: any, idx: number) => (
                                                <a key={idx} href={file.url || '#'} target="_blank" rel="noreferrer" className="flex items-center p-2 bg-muted/30 border rounded-lg hover:border-blue-300 transition-colors group shadow-sm max-w-full">
                                                    <div className="bg-blue-50 p-1.5 rounded mr-2 text-blue-600 shrink-0">
                                                        <Paperclip className="h-4 w-4"/>
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                                                        <span className="text-sm font-medium truncate text-gray-700">{file.name}</span>
                                                        {file.size && <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>}
                                                    </div>
                                                    <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                  </div>
                </div>
              </Card>
            )})}
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4 flex-1">
            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md border">
                <div className="flex items-center gap-1 text-sm overflow-hidden">
                    {folderPath.map((folder, idx) => (
                        <div key={idx} className="flex items-center">
                            {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                            <button onClick={() => { const newPath = folderPath.slice(0, idx + 1); setFolderPath(newPath); setCurrentFolderId(folder.id); }} className={`hover:underline ${idx === folderPath.length - 1 ? 'font-bold' : 'text-muted-foreground'}`}>{folder.name}</button>
                        </div>
                    ))}
                </div>
                {isLecturer && (
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-semibold border-0 shadow-sm rounded-md px-4 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800">
                                    <Plus className="h-4 w-4 mr-1" /> New <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 shadow-xl">
                                <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)} className="cursor-pointer font-medium py-2">
                                    <Folder className="h-4 w-4 mr-3 text-yellow-500 fill-yellow-500" /> Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => alert('Word document creation not implemented')}>
                                    <FileText className="h-4 w-4 mr-3 text-blue-500 fill-blue-500" /> Word document
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => alert('Excel workbook creation not implemented')}>
                                    <FileSpreadsheet className="h-4 w-4 mr-3 text-green-500 fill-green-500" /> Excel workbook
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => alert('PowerPoint presentation creation not implemented')}>
                                    <FileImage className="h-4 w-4 mr-3 text-orange-500 fill-orange-500" /> PowerPoint presentation
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => alert('OneNote notebook creation not implemented')}>
                                    <File className="h-4 w-4 mr-3 text-purple-500 fill-purple-500" /> OneNote notebook
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center relative">
                            <input type="file" id="file-upload-input" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                            {/* @ts-ignore */}
                            <input type="file" id="folder-upload-input" webkitdirectory="true" directory="true" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" disabled={isUploading}>
                                        {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Upload <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 shadow-xl">
                                    <DropdownMenuItem className="cursor-pointer py-2" onClick={() => document.getElementById('file-upload-input')?.click()}>
                                        <File className="h-4 w-4 mr-3" /> Files
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer py-2" onClick={() => document.getElementById('folder-upload-input')?.click()}>
                                        <Folder className="h-4 w-4 mr-3" /> Folder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {materials.map(file => (
                    <Card key={file.id} className="group relative hover:shadow-md cursor-pointer transition-all hover:bg-accent/5" onClick={() => handleFileClick(file)}>
                        {(isLecturer || profile?.role === 'admin') && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 z-10 shadow-sm bg-background/90 backdrop-blur-sm"
                                onClick={(e) => handleDeleteMaterial(e, file.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <CardContent className="p-4 flex flex-col items-center text-center gap-3 h-full justify-center">
                            {getFileIcon(file.file_type)} <span className="text-sm font-medium leading-tight line-clamp-2 break-all px-2">{file.title}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
            {isLecturer && (
                <Button onClick={() => setShowNewAssignmentDialog(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Create Assignment
                </Button>
            )}

            <div className="grid gap-4">
                {assignments.length === 0 && <div className="text-center py-12 text-muted-foreground">No active assignments.</div>}
                
                {assignments.map(assign => {
                    const submission = mySubmissions.find(s => s.assignment_id === assign.id);
                    const isSubmitted = !!submission;
                    const isLate = isSubmitted && new Date(submission.submitted_at) > new Date(assign.due_date);
                    const isMissing = !isSubmitted && new Date() > new Date(assign.due_date);

                    return (
                        <Card 
                            key={assign.id} 
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => {
                                setSelectedAssignment(assign);
                                setSubmissionFiles(getSubmissionFiles(submission?.files ?? null));
                            }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold">{assign.title}</CardTitle>
                                {isLecturer ? (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAssignment(assign.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        {submission?.grade != null && <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Graded</Badge>}
                                        <Badge variant={isSubmitted ? (isLate ? "destructive" : "default") : (isMissing ? "destructive" : "outline")}>
                                            {isSubmitted ? (isLate ? "Done Late" : "Turned In") : (isMissing ? "Missing" : "Assigned")}
                                        </Badge>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground flex justify-between items-center mt-2">
                                    <span>Due: {new Date(assign.due_date).toLocaleDateString()}</span>
                                    {submission?.grade != null ? (
                                        <Badge variant="secondary" className="text-sm font-bold bg-green-100 text-green-800 hover:bg-green-200 px-2">
                                            {submission.grade} / {getAssignmentMaxScore(assign)}
                                        </Badge>
                                    ) : (
                                        <span>{getAssignmentMaxScore(assign)} pts</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </TabsContent>

        <TabsContent value="people">
            {people.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No people found in this course.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-lg font-semibold mb-4 border-b pb-3">Teachers</h2>
                        <div className="border rounded-md divide-y bg-card">
                            {people.filter(p => p.role === 'lecturer' || p.role === 'admin').map((person, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/profile/${person.id}`)}
                                >
                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                                        <AvatarImage src={person.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {person.full_name ? person.full_name[0].toUpperCase() : '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">
                                            {person.full_name || "Unknown User"}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {person.role || "Lecturer"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h2 className="text-lg font-semibold">Students</h2>
                            {(isLecturer || profile?.role === 'admin') && (
                                <Button size="sm" onClick={() => { fetchAvailableStudents(); setShowAddStudentDialog(true); }}>
                                    <UserPlus className="h-4 w-4 mr-2" /> Add Student
                                </Button>
                            )}
                        </div>
                        <div className="border rounded-md divide-y bg-card">
                            {people.filter(p => p.role !== 'lecturer' && p.role !== 'admin').map((person, idx) => (
                                <div 
                                    key={idx} 
                                    className="group flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/profile/${person.id}`)}
                                >
                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                                        <AvatarImage src={person.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {person.full_name ? person.full_name[0].toUpperCase() : '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1">
                                        <span className="font-semibold text-sm">
                                            {person.full_name || "Unknown User"}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {person.role || "Student"}
                                        </span>
                                    </div>
                                    {(isLecturer || profile?.role === 'admin') && (
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity mr-2" onClick={(e) => handleRemoveStudent(e, person.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {people.filter(p => p.role !== 'lecturer' && p.role !== 'admin').length === 0 && (
                                <div className="p-4 text-sm text-muted-foreground">No students enrolled yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </TabsContent>
      </Tabs>

      <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
        <DialogContent className="max-w-md" hideCloseButton>
            <DialogHeader className="flex flex-row justify-between items-center">
                <DialogTitle>Add Student to Course</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAddStudentDialog(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Input 
                    placeholder="Search by name..." 
                    value={addStudentSearchQuery} 
                    onChange={e => setAddStudentSearchQuery(e.target.value)} 
                />
                
                {availableStudents.filter(s => s.full_name?.toLowerCase().includes(addStudentSearchQuery.toLowerCase())).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg">No matching students found.</p>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {availableStudents
                            .filter(s => s.full_name?.toLowerCase().includes(addStudentSearchQuery.toLowerCase()))
                            .map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 shadow-sm border border-muted">
                                        <AvatarImage src={student.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">{student.full_name}</span>
                                        <span className="text-xs text-muted-foreground">Student</span>
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => handleAddStudent(student.id)}>Add</Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewAssignmentDialog} onOpenChange={(open: boolean) => setShowNewAssignmentDialog(open)}>
        <DialogContent className="max-w-2xl" hideCloseButton>
            <DialogHeader className="flex flex-row justify-between items-center">
                <DialogTitle>Create Assignment</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowNewAssignmentDialog(false)}><X className="h-4 w-4" /></Button>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={newAssign.title} onChange={e => setNewAssign({...newAssign, title: e.target.value})} placeholder="Assignment Title" />
                    </div>
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input type="date" value={newAssign.due_date} onChange={e => setNewAssign({...newAssign, due_date: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Textarea value={newAssign.description} onChange={e => setNewAssign({...newAssign, description: e.target.value})} placeholder="Describe the task..." />
                </div>
                <div className="space-y-2">
                    <Label>Rubric / Grading Criteria (Optional)</Label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                        {newRubricFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No rubric attached yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 justify-center w-full">
                                {newRubricFiles.map((f, i) => (
                                    <Badge key={i} variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                                        <Paperclip className="h-3 w-3"/>{f.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Button type="button" variant="outline" onClick={() => document.getElementById('rubric-upload')?.click()} disabled={isUploading} className="bg-white dark:bg-zinc-950">
                            <Paperclip className="h-4 w-4 mr-2" /> Add Rubric
                        </Button>
                        <Input id="rubric-upload" type="file" className="hidden" onChange={(e) => uploadTempFile(e, setNewRubricFiles, newRubricFiles)} disabled={isUploading} multiple />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Points (Optional)</Label>
                    <Input type="number" value={newAssign.points} onChange={e => setNewAssign({...newAssign, points: e.target.value})} placeholder="100" />
                </div>
                <div className="space-y-2">
                    <Label>Attach Materials</Label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                        {newAssignFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No materials attached yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 justify-center w-full">
                                {newAssignFiles.map((f, i) => (
                                     <Badge key={i} variant="secondary" className="gap-1"><Paperclip className="h-3 w-3"/>{f.name}</Badge>
                                ))}
                            </div>
                        )}
                        <Button type="button" variant="outline" onClick={() => document.getElementById('materials-upload')?.click()} disabled={isUploading} className="bg-white dark:bg-zinc-950">
                            <Paperclip className="h-4 w-4 mr-2" /> Add Materials
                        </Button>
                        <Input id="materials-upload" type="file" className="hidden" onChange={(e) => uploadTempFile(e, setNewAssignFiles, newAssignFiles)} disabled={isUploading} multiple />
                    </div>
                </div>
            </div>
            <DialogFooter><Button onClick={handleCreateAssignment} disabled={!newAssign.title || !newAssign.due_date || isUploading}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAssignment} onOpenChange={(open: boolean) => !open && setSelectedAssignment(null)}>
        <DialogContent hideCloseButton className="assignment-detail-dialog">
            {selectedAssignment && (
                <>
                <div className="assignment-detail-header border-b bg-gray-50">
                    <div className="flex items-center gap-4">
                        {isLecturer && gradingStudentId && (
                            <Button variant="ghost" size="sm" onClick={() => setGradingStudentId(null)}>
                                <ChevronLeft className="h-4 w-4 mr-1"/> Back to List
                            </Button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900">{selectedAssignment.title}</h2>
                            <p className="text-xs text-gray-500">Due {new Date(selectedAssignment.due_date).toLocaleDateString()} • {getAssignmentMaxScore(selectedAssignment)} Points</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAssignment(null)} aria-label="Close assignment">
                        <X className="h-5 w-5 text-gray-500" />
                    </Button>
                </div>

                <div className="assignment-detail-body">
                    
                    <div className="assignment-detail-content">
                        
                        {isLecturer && !gradingStudentId && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800"><Users className="h-5 w-5"/> Student Submissions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {people.filter(p => p.role === 'student').map(student => {
                                        const sub = allSubmissions.find(s => s.student_id === student.id);
                                        const isLate = sub && new Date(sub.submitted_at) > new Date(selectedAssignment.due_date);
                                        
                                        return (
                                            <Card 
                                                key={student.id} 
                                                className={`cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${sub ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'}`}
                                                onClick={() => setGradingStudentId(student.id)}
                                            >
                                                <CardContent className="p-4 flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-gray-200">
                                                        <AvatarImage src={student.avatar_url} />
                                                        <AvatarFallback>{student.full_name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-semibold text-sm truncate text-gray-900">{student.full_name}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            {sub ? (
                                                                <Badge variant={isLate ? "destructive" : "default"} className="text-[10px] h-5 px-2">{isLate ? "Late" : "Submitted"}</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] h-5 px-2 text-gray-400">Missing</Badge>
                                                            )}
                                                            {sub?.grade && <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100">Graded: {sub.grade}</Badge>}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-400"/>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(!isLecturer || gradingStudentId) && (
                            <div className="space-y-8 max-w-4xl mx-auto">
                                
                                {/* FIX: Ensure we're finding the RIGHT submission for the current student being graded */}
                                {isLecturer && gradingStudentId ? (
                                    <div className="pt-2">
                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800"><User className="h-5 w-5"/> Student Submission</h3>
                                        
                                        {(() => {
                                            const studentSub = allSubmissions.find(s => s.student_id === gradingStudentId);
                                            
                                            if (studentSub?.files?.length > 0) {
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {studentSub.files.map((f: any, i: number) => (
                                                            <a key={i} href={f.path} target="_blank" rel="noreferrer" className="flex items-center p-4 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group">
                                                                <div className="bg-blue-100 p-3 rounded-lg mr-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                    <FileText className="h-6 w-6"/>
                                                                </div>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className="font-medium text-blue-900 truncate">{f.name}</p>
                                                                    <p className="text-xs text-blue-400">Click to view</p>
                                                                </div>
                                                                <Download className="h-5 w-5 text-gray-300 group-hover:text-blue-500"/>
                                                            </a>
                                                        ))}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
                                                        Student has not attached any files yet.
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                ) : (
                                    /* Normal Student View Logic */
                                    <>
                                        {mySubmissions.find(s => s.assignment_id === selectedAssignment.id)?.grade != null && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-green-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                                        <GraduationCap className="h-4 w-4"/> Graded & Returned
                                                    </h4>
                                                    <Badge variant="secondary" className="bg-white text-green-700 border-green-200">
                                                        {new Date(mySubmissions.find(s => s.assignment_id === selectedAssignment.id).submitted_at).toLocaleDateString()}
                                                    </Badge>
                                                </div>
                                                <div className="text-4xl font-bold text-gray-900 mb-4">
                                                    {mySubmissions.find(s => s.assignment_id === selectedAssignment.id).grade} 
                                                    <span className="text-lg font-medium text-gray-400"> / {getAssignmentMaxScore(selectedAssignment)}</span>
                                                </div>
                                                {mySubmissions.find(s => s.assignment_id === selectedAssignment.id).feedback && (
                                                    <div className="bg-white p-4 rounded-lg border border-green-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                                                        <span className="font-bold text-gray-900 block mb-2">Lecturer Feedback:</span>
                                                        {mySubmissions.find(s => s.assignment_id === selectedAssignment.id).feedback}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-gray-500"/> Instructions
                                            </h4>
                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{selectedAssignment.description || "No instructions provided."}</p>
                                            
                                            {selectedAssignment.rubric && (
                                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                                    <h3 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                                        <Sparkles className="h-5 w-5" /> 
                                                        Grading Rubric
                                                    </h3>
                                                    <div className="grid gap-2">
                                                        {(() => {
                                                            try {
                                                                const parsedRubrics = JSON.parse(selectedAssignment.rubric);
                                                                if (Array.isArray(parsedRubrics)) {
                                                                    return parsedRubrics.map((file: any, idx: number) => (
                                                                        <a key={idx} href={file.path} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-white border rounded-lg hover:border-blue-400 transition-colors shadow-sm">
                                                                            <div className="bg-blue-100 p-2 rounded mr-3 text-blue-700"><FileText className="h-4 w-4"/></div>
                                                                            <span className="text-sm font-medium truncate flex-1 text-blue-900">{file.name}</span>
                                                                            <Download className="h-4 w-4 text-blue-400" />
                                                                        </a>
                                                                    ));
                                                                }
                                                                return <p className="whitespace-pre-wrap text-sm text-blue-700 dark:text-blue-400">{selectedAssignment.rubric}</p>;
                                                            } catch (e) {
                                                                return <p className="whitespace-pre-wrap text-sm text-blue-700 dark:text-blue-400">{selectedAssignment.rubric}</p>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedAssignment.attachments?.length > 0 && (
                                                <div className="mt-6 grid gap-2">
                                                    {selectedAssignment.attachments.map((file: any, idx: number) => (
                                                        <a key={idx} href={file.path} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors group shadow-sm">
                                                            <div className="bg-blue-50 p-2 rounded mr-3 text-blue-600"><FileText className="h-4 w-4"/></div>
                                                            <span className="text-sm font-medium truncate flex-1 text-gray-700">{file.name}</span>
                                                            <Download className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="assignment-detail-sidebar bg-gray-50">
                        
                        {isLecturer ? (
                            gradingStudentId ? (
                                <div className="assignment-grading-panel">
                                    <div className="assignment-grading-header border-b border-gray-200">
                                        <h3 className="font-bold text-lg mb-1 text-gray-900">Grading</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            Student: <span className="font-medium text-gray-900">{people.find(p => p.id === gradingStudentId)?.full_name}</span>
                                        </p>
                                    </div>

                                    <Card className="assignment-ai-card bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm overflow-hidden">
                                        <CardContent className="assignment-ai-card-content">
                                            <div className="assignment-ai-card-title flex items-center gap-2 text-indigo-700 font-bold text-sm">
                                                <Sparkles className="h-4 w-4 text-indigo-500" /> AI Grader
                                            </div>
                                            <p className="assignment-ai-card-description text-xs text-gray-600 leading-relaxed">
                                                Click below to analyze this submission. AI grading never starts automatically.
                                            </p>
                                            {aiGradingError && (
                                                <div className="assignment-ai-error" role="alert">
                                                    {aiGradingError}
                                                </div>
                                            )}
                                            <Button 
                                                type="button"
                                                onClick={handleAiAutoGrade} 
                                                disabled={isAiGrading}
                                                size="sm" 
                                                className="assignment-ai-grade-button"
                                            >
                                                {isAiGrading ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Sparkles className="h-3 w-3 mr-2"/>}
                                                {isAiGrading ? "Analyzing..." : aiGradingError ? "Try Again" : "Start AI Grading"}
                                            </Button>
                                            {aiGradeDetails && (
                                                <details className="assignment-ai-details">
                                                    <summary>
                                                        <span>View grading details</span>
                                                        {aiGradeDetails.confidence != null && (
                                                            <span className="assignment-ai-confidence">
                                                                {aiGradeDetails.confidence}% confidence
                                                            </span>
                                                        )}
                                                    </summary>
                                                    <div className="assignment-ai-details-content">
                                                        {aiGradeDetails.criteria.length > 0 && (
                                                            <div className="assignment-ai-criteria">
                                                                {aiGradeDetails.criteria.map((criterion, index) => (
                                                                    <div className="assignment-ai-criterion" key={`${criterion.name}-${index}`}>
                                                                        <div className="assignment-ai-criterion-heading">
                                                                            <span>{criterion.name}</span>
                                                                            <strong>{criterion.score}/{criterion.maxScore}</strong>
                                                                        </div>
                                                                        {criterion.reason && <p>{criterion.reason}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {aiGradeDetails.warnings.length > 0 && (
                                                            <div className="assignment-ai-review-notes">
                                                                <strong>Review notes</strong>
                                                                {aiGradeDetails.warnings.map((warning, index) => (
                                                                    <p key={index}>{warning}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </details>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <div className="assignment-grading-form">
                                        <div className="assignment-grading-field">
                                            <Label className="text-gray-700 font-semibold">Score</Label>
                                            <div className="assignment-score-row">
                                                <Input 
                                                    type="number" 
                                                    min={0}
                                                    max={getAssignmentMaxScore(selectedAssignment)}
                                                    value={currentGrade} 
                                                    onChange={e => setCurrentGrade(e.target.value)} 
                                                    className="assignment-score-input text-2xl font-bold text-center bg-white"
                                                    placeholder="-"
                                                />
                                                <span className="assignment-score-total text-gray-400 text-lg font-medium">/ {getAssignmentMaxScore(selectedAssignment)}</span>
                                            </div>
                                        </div>
                                        <div className="assignment-grading-field">
                                            <Label className="text-gray-700 font-semibold">Feedback</Label>
                                            <Textarea 
                                                value={currentFeedback} 
                                                onChange={e => setCurrentFeedback(e.target.value)} 
                                                className="assignment-feedback-input bg-white text-base leading-relaxed"
                                                placeholder="Enter detailed feedback for the student..."
                                            />
                                        </div>
                                        <Button onClick={handleSaveGrade} className="assignment-save-grade-button text-lg shadow-lg hover:shadow-xl transition-all">
                                            Save Grade & Return
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
                                    <div className="bg-white p-6 rounded-full mb-4 shadow-sm border border-gray-100"><Users className="h-10 w-10 opacity-20"/></div>
                                    <p className="font-medium">Select a student from the list on the left to begin grading.</p>
                                </div>
                            )
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Your Work</h3>
                                    <p className="text-sm text-gray-500">Upload your files below</p>
                                </div>

                                <Card className="border-t-4 border-t-primary shadow-sm bg-white">
                                    <CardContent className="p-5 space-y-5">
                                        {submissionFiles.length > 0 ? (
                                            <div className="space-y-2">
                                                {submissionFiles.map((f, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg text-sm group">
                                                        <div className="flex items-center truncate text-blue-700 font-medium">
                                                            <File className="h-4 w-4 mr-2 text-gray-400"/>
                                                            <span className="truncate max-w-[180px]">{f.name}</span>
                                                        </div>
                                                        {!mySubmissions.find(s=>s.assignment_id===selectedAssignment.id) && (
                                                            <button onClick={() => setSubmissionFiles(submissionFiles.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 p-1">
                                                                <X className="h-4 w-4"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-center text-gray-400 py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                                No files attached yet.
                                            </div>
                                        )}

                                        {mySubmissions.find(s => s.assignment_id === selectedAssignment.id) ? (
                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center justify-center gap-2 text-green-700 font-bold p-3 bg-green-50 border border-green-200 rounded-lg">
                                                    <CheckCircle className="h-5 w-5"/> Turned In
                                                </div>
                                                <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleUndoTurnIn}>
                                                    Unsubmit
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 pt-2">
                                                <div className="relative group">
                                                    <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => uploadTempFile(e, setSubmissionFiles, submissionFiles)} disabled={isUploading} />
                                                    <Button variant="secondary" className="w-full h-12 text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 border transition-all" disabled={isUploading}>
                                                        {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2"/>} 
                                                        Add File
                                                    </Button>
                                                </div>
                                                <Button className="w-full font-bold h-12 text-lg shadow-md hover:shadow-lg transition-all" onClick={handleTurnIn} disabled={submissionFiles.length === 0}>
                                                    Turn In
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={showNewFolderDialog} onOpenChange={(open: boolean) => setShowNewFolderDialog(open)}>
        <DialogContent hideCloseButton>
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>New Folder</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowNewFolderDialog(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </DialogHeader>
          <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
          <DialogFooter><Button onClick={handleCreateFolder}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
