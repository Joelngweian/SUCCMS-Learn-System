import type { MouseEvent } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import type { CoursePerson } from "./coursePageTypes";

type CoursePeopleTabProps = {
  people: CoursePerson[];
  canManage: boolean;
  onOpenProfile: (userId: string) => void;
  onOpenAddStudent: () => void;
  onRemoveStudent: (event: MouseEvent, studentId: string) => void;
};

export function CoursePeopleTab({
  people,
  canManage,
  onOpenProfile,
  onOpenAddStudent,
  onRemoveStudent,
}: CoursePeopleTabProps) {
  const teachers = people.filter(
    person => person.role === "lecturer" || person.role === "admin"
  );
  const students = people.filter(
    person => person.role !== "lecturer" && person.role !== "admin"
  );

  return (
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
              {teachers.map(person => (
                <div
                  key={person.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                  onClick={() => onOpenProfile(person.id)}
                >
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {person.full_name ? person.full_name[0].toUpperCase() : "?"}
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
              {canManage && (
                <Button size="sm" onClick={onOpenAddStudent}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Student
                </Button>
              )}
            </div>
            <div className="border rounded-md divide-y bg-card">
              {students.map(person => (
                <div
                  key={person.id}
                  className="group flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                  onClick={() => onOpenProfile(person.id)}
                >
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {person.full_name ? person.full_name[0].toUpperCase() : "?"}
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
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                      onClick={event => onRemoveStudent(event, person.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {students.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No students enrolled yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
