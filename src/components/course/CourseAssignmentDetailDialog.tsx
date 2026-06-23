import type { ChangeEvent } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAssignmentMaxScore,
  type AiGradeDetails,
  type CourseAssignment,
  type CoursePerson,
  type CourseSubmission,
  type SubmissionFile,
} from "./coursePageTypes";
import { CourseAssignmentResources } from "./CourseAssignmentResources";
import { resolveSubmissionFileUrl } from "@/lib/submissionStorage";
import { notify } from "@/lib/notify";

type CourseAssignmentDetailDialogProps = {
  assignment: CourseAssignment | null;
  isLecturer: boolean;
  gradingStudentId: string | null;
  people: CoursePerson[];
  allSubmissions: CourseSubmission[];
  mySubmissions: CourseSubmission[];
  submissionFiles: SubmissionFile[];
  isUploading: boolean;
  isAiGrading: boolean;
  aiGradingError: string;
  aiGradeDetails: AiGradeDetails | null;
  currentGrade: string;
  currentFeedback: string;
  onClose: () => void;
  onGradingStudentChange: (studentId: string | null) => void;
  onSubmissionFilesChange: (files: SubmissionFile[]) => void;
  onUploadSubmissionFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onTurnIn: () => void;
  onUndoTurnIn: () => void;
  onAiGrade: () => void;
  onGradeChange: (value: string) => void;
  onFeedbackChange: (value: string) => void;
  onSaveGrade: () => void;
};

export function CourseAssignmentDetailDialog({
  assignment,
  isLecturer,
  gradingStudentId,
  people,
  allSubmissions,
  mySubmissions,
  submissionFiles,
  isUploading,
  isAiGrading,
  aiGradingError,
  aiGradeDetails,
  currentGrade,
  currentFeedback,
  onClose,
  onGradingStudentChange,
  onSubmissionFilesChange,
  onUploadSubmissionFile,
  onTurnIn,
  onUndoTurnIn,
  onAiGrade,
  onGradeChange,
  onFeedbackChange,
  onSaveGrade,
}: CourseAssignmentDetailDialogProps) {
  if (!assignment) return null;

  const mySubmission = mySubmissions.find(
    submission => submission.assignment_id === assignment.id
  );
  const gradingSubmission = allSubmissions.find(
    submission => submission.student_id === gradingStudentId
  );
  const gradingStudent = people.find(person => person.id === gradingStudentId);

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent hideCloseButton className="assignment-detail-dialog">
        <div className="assignment-detail-header border-b bg-gray-50">
          <div className="flex items-center gap-4">
            {isLecturer && gradingStudentId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGradingStudentChange(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
              </Button>
            )}
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {assignment.title}
              </h2>
              <p className="text-xs text-gray-500">
                Due {new Date(assignment.due_date).toLocaleDateString()}
                {" | "}
                {getAssignmentMaxScore(assignment)} Points
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close assignment"
          >
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>

        <div className="assignment-detail-body">
          <div className="assignment-detail-content">
            {isLecturer && !gradingStudentId && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                  <Users className="h-5 w-5" /> Student Submissions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {people
                    .filter(person => person.role === "student")
                    .map(student => {
                      const submission = allSubmissions.find(
                        item => item.student_id === student.id
                      );
                      const isLate = submission
                        && new Date(submission.submitted_at)
                          > new Date(assignment.due_date);

                      return (
                        <Card
                          key={student.id}
                          className={`cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${
                            submission
                              ? "bg-blue-50/50 border-blue-200"
                              : "bg-white border-gray-200"
                          }`}
                          onClick={() => onGradingStudentChange(student.id)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-gray-200">
                              <AvatarImage src={student.avatar_url} />
                              <AvatarFallback>
                                {student.full_name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-semibold text-sm truncate text-gray-900">
                                {student.full_name}
                              </p>
                              <div className="flex gap-2 mt-1">
                                {submission ? (
                                  <Badge
                                    variant={isLate ? "destructive" : "default"}
                                    className="text-[10px] h-5 px-2"
                                  >
                                    {isLate ? "Late" : "Submitted"}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 px-2 text-gray-400"
                                  >
                                    Missing
                                  </Badge>
                                )}
                                {submission?.grade && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100"
                                  >
                                    Graded: {submission.grade}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {(!isLecturer || gradingStudentId) && (
              <div className="space-y-8 max-w-4xl mx-auto">
                {isLecturer && gradingStudentId ? (
                  <div className="pt-2">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                      <User className="h-5 w-5" /> Student Submission
                    </h3>
                    {gradingSubmission?.files?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gradingSubmission.files.map((file, index) => (
                          <button
                            key={`${file.path}-${index}`}
                            type="button"
                            onClick={() => {
                              void resolveSubmissionFileUrl(file)
                                .then((url) =>
                                  window.open(url, "_blank", "noopener,noreferrer")
                                )
                                .catch((error) =>
                                  notify.error(
                                    error,
                                    "The submission file could not be opened.",
                                  )
                                );
                            }}
                            className="flex items-center p-4 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                          >
                            <div className="bg-blue-100 p-3 rounded-lg mr-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-medium text-blue-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-blue-400">Click to view</p>
                            </div>
                            <Download className="h-5 w-5 text-gray-300 group-hover:text-blue-500" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">
                        Student has not attached any files yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {mySubmission?.grade != null && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-green-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Graded & Returned
                          </h4>
                          <Badge
                            variant="secondary"
                            className="bg-white text-green-700 border-green-200"
                          >
                            {new Date(mySubmission.submitted_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="text-4xl font-bold text-gray-900 mb-4">
                          {mySubmission.grade}
                          <span className="text-lg font-medium text-gray-400">
                            {" / "}
                            {getAssignmentMaxScore(assignment)}
                          </span>
                        </div>
                        {mySubmission.feedback && (
                          <div className="bg-white p-4 rounded-lg border border-green-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                            <span className="font-bold text-gray-900 block mb-2">
                              Lecturer Feedback:
                            </span>
                            {mySubmission.feedback}
                          </div>
                        )}
                      </div>
                    )}
                    <CourseAssignmentResources assignment={assignment} />
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
                    <h3 className="font-bold text-lg mb-1 text-gray-900">
                      Grading
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      Student:
                      <span className="font-medium text-gray-900">
                        {gradingStudent?.full_name}
                      </span>
                    </p>
                  </div>

                  <Card className="assignment-ai-card bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm overflow-hidden">
                    <CardContent className="assignment-ai-card-content">
                      <div className="assignment-ai-card-title flex items-center gap-2 text-indigo-700 font-bold text-sm">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        AI Grader
                      </div>
                      <p className="assignment-ai-card-description text-xs text-gray-600 leading-relaxed">
                        Click below to analyze this submission. AI grading never
                        starts automatically.
                      </p>
                      {aiGradingError && (
                        <div className="assignment-ai-error" role="alert">
                          {aiGradingError}
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={onAiGrade}
                        disabled={isAiGrading}
                        size="sm"
                        className="assignment-ai-grade-button"
                      >
                        {isAiGrading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-2" />
                        )}
                        {isAiGrading
                          ? "Analyzing..."
                          : aiGradingError
                            ? "Try Again"
                            : "Start AI Grading"}
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
                                  <div
                                    className="assignment-ai-criterion"
                                    key={`${criterion.name}-${index}`}
                                  >
                                    <div className="assignment-ai-criterion-heading">
                                      <span>{criterion.name}</span>
                                      <strong>
                                        {criterion.score}/{criterion.maxScore}
                                      </strong>
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
                          max={getAssignmentMaxScore(assignment)}
                          value={currentGrade}
                          onChange={event => onGradeChange(event.target.value)}
                          className="assignment-score-input text-2xl font-bold text-center bg-white"
                          placeholder="-"
                        />
                        <span className="assignment-score-total text-gray-400 text-lg font-medium">
                          / {getAssignmentMaxScore(assignment)}
                        </span>
                      </div>
                    </div>
                    <div className="assignment-grading-field">
                      <Label className="text-gray-700 font-semibold">
                        Feedback
                      </Label>
                      <Textarea
                        value={currentFeedback}
                        onChange={event => onFeedbackChange(event.target.value)}
                        className="assignment-feedback-input bg-white text-base leading-relaxed"
                        placeholder="Enter detailed feedback for the student..."
                      />
                    </div>
                    <Button
                      onClick={onSaveGrade}
                      className="assignment-save-grade-button text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      Save Grade & Return
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
                  <div className="bg-white p-6 rounded-full mb-4 shadow-sm border border-gray-100">
                    <Users className="h-10 w-10 opacity-20" />
                  </div>
                  <p className="font-medium">
                    Select a student from the list on the left to begin grading.
                  </p>
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
                        {submissionFiles.map((file, index) => (
                          <div
                            key={`${file.path}-${index}`}
                            className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg text-sm group"
                          >
                            <div className="flex items-center truncate text-blue-700 font-medium">
                              <File className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="truncate max-w-[180px]">
                                {file.name}
                              </span>
                            </div>
                            {!mySubmission && (
                              <button
                                onClick={() => onSubmissionFilesChange(
                                  submissionFiles.filter(
                                    (_, itemIndex) => itemIndex !== index
                                  )
                                )}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <X className="h-4 w-4" />
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

                    {mySubmission ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-center gap-2 text-green-700 font-bold p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5" /> Turned In
                        </div>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={onUndoTurnIn}
                        >
                          Unsubmit
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="relative group">
                          <Input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={onUploadSubmissionFile}
                            disabled={isUploading}
                          />
                          <Button
                            variant="secondary"
                            className="w-full h-12 text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 border transition-all"
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Add File
                          </Button>
                        </div>
                        <Button
                          className="w-full font-bold h-12 text-lg shadow-md hover:shadow-lg transition-all"
                          onClick={onTurnIn}
                          disabled={submissionFiles.length === 0}
                        >
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
      </DialogContent>
    </Dialog>
  );
}
