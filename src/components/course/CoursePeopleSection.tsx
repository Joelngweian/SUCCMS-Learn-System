import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { AddStudentDialog } from "./CourseDialogs";
import { CoursePeopleTab } from "./CoursePeopleTab";
import { useCoursePeople } from "./useCoursePeople";

type CoursePeopleSectionProps = {
  courseId: string;
  courseOwnerId?: string | null;
};

export function CoursePeopleSection({
  courseId,
  courseOwnerId,
}: CoursePeopleSectionProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const people = useCoursePeople(courseId, courseOwnerId);

  const handleAddStudent = async (studentId: string) => {
    try {
      await people.addStudent(studentId);
      setShowAddStudentDialog(false);
      notify.success("Student added to the course.");
    } catch (error) {
      notify.error(error, "Failed to add student.");
    }
  };

  return (
    <>
      <CoursePeopleTab
        people={people.people}
        canManage={profile?.role === "lecturer" || profile?.role === "admin"}
        onOpenProfile={(personId) => navigate(`/profile/${personId}`)}
        onOpenAddStudent={() => {
          void people.fetchAvailableStudents();
          setShowAddStudentDialog(true);
        }}
        onRemoveStudent={(event, studentId) => {
          void people.removeStudent(event, studentId)
            .then((removed) => {
              if (removed) notify.success("Student removed from the course.");
            })
            .catch((error) => {
              notify.error(error, "Failed to remove student.");
            });
        }}
      />

      <AddStudentDialog
        open={showAddStudentDialog}
        searchQuery={people.addStudentSearchQuery}
        students={people.availableStudents}
        onOpenChange={setShowAddStudentDialog}
        onSearchChange={people.setAddStudentSearchQuery}
        onAddStudent={(studentId) => void handleAddStudent(studentId)}
      />
    </>
  );
}
