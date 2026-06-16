import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CourseCreationRequestDialogProps {
  open: boolean;
  requesterId: string | null;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  subjectCode: "",
  subjectName: "",
  faculty: "",
  programme: "",
  credits: "",
  reason: "",
};

const FACULTY_PROGRAMME_OPTIONS = [
  {
    faculty: "Faculty of Art & Design",
    programmes: [
      "Diploma in Advertising Design",
      "Diploma in Industrial Design",
      "Diploma in Multimedia Design",
      "Diploma in Visual Art",
      "Bachelor in Computer Graphic Design (Honours)",
      "Bachelor in Industrial Design (Honours)",
    ],
  },
  {
    faculty: "Faculty of Business & Management",
    programmes: [
      "Diploma in Accountancy",
      "Diploma in Financial Analysis",
      "Diploma in Marketing",
      "Diploma in Logistics Management",
      "Diploma in International Business",
      "Diploma in Tourism Management",
      "Diploma in Business Administration",
      "Bachelor in Accounting (Honours)",
      "Bachelor of Business Administration (Honours)",
      "Bachelor of Business Administration (Honours) in Finance",
      "Bachelor of Business Administration (Honours) in Marketing",
      "Bachelor of Business Administration (Honours) in Tourism Management",
      "Bachelor of Business Administration (Honours) in Human Resource Management",
      "Bachelor of Property Management (Honours)",
      "Master of Business Administration",
      "Doctor of Business Administration (DBA)",
    ],
  },
  {
    faculty: "Faculty of Chinese Medicine",
    programmes: ["Bachelor of Traditional Chinese Medicine"],
  },
  {
    faculty: "Faculty of Chinese Studies",
    programmes: [
      "Diploma in Chinese Studies",
      "Bachelor of Arts (Honours) Chinese Studies",
      "Master of Arts in Chinese Studies / Master of Chinese Studies",
      "Doctor of Philosophy (Chinese Studies) / Doctor of Chinese Studies",
      "Doctor of Philosophy in Global Chinese and Cultural Studies",
    ],
  },
  {
    faculty: "Faculty of Engineering & Information Technology",
    programmes: [
      "Diploma in Computer Science",
      "Diploma in Information Technology",
      "Diploma in Electrical & Electronics Engineering",
      "Bachelor of Software Engineering (Honours)",
      "Bachelor of Electronic Engineering with Honours",
      "Master of Science in Computer Science",
      "Master of Engineering Science",
    ],
  },
  {
    faculty: "Faculty of Humanities & Social Science",
    programmes: [
      "Diploma in English Language",
      "Diploma in Journalism",
      "Diploma in Early Childhood Education",
      "Bachelor of Arts (Honours) English Language Teaching",
      "Bachelor of Communication (Honours) (Mass Communication)",
      "Bachelor of Education (Honours) (Guidance & Counselling)",
      "Bachelor of Psychology (Honours)",
      "Bachelor of Early Childhood Education (Honours)",
      "Master of Communication",
      "Master in Education",
      "Master in English Language Studies",
    ],
  },
  {
    faculty: "School of Foundation Studies",
    programmes: [
      "Foundation in Arts",
      "Foundation in Science",
      "Foundation in Traditional Chinese Medicine",
    ],
  },
  {
    faculty: "School of Professional Continuing Education (SPACE)",
    programmes: [
      "Professional Diploma in Business Management (PDBM)",
      "Certificate of Completion in Chinese Wedding Planner",
      "Professional Certificate in Floral Design Entrepreneur (PCFD)",
      "Professional Certificate in Modern Pop Music",
      "Professional Diploma in Multimedia Design (PDMD)",
      "Professional Diploma in Graphic Design (PDGR)",
      "Professional Diploma in Cultivational Beauty (PDCB)",
      "Professional Diploma in Makeup, Hairstyling & Image (PDMH)",
      "Professional Diploma in IT System Support (PDIT)",
      "Professional Diploma in Automotive Technical (PDAT)",
      "Professional Diploma in Modern Pop Music Performance",
      "Professional Diploma in Barista (PDBR)",
      "Professional Diploma in Western Cuisine (PDWC)",
      "Professional Diploma in Chinese Cuisine (PDCC)",
      "Professional Diploma in Japanese Cuisine (PDJC)",
      "Professional Diploma in Bakery & Pastry (PDPB)",
      "Professional Diploma in Culinary Arts and F&B Management (Western & Chinese) (PDFB)",
      "Professional Diploma in Unreal Engine VR Architecture (PDVR)",
      "Professional Diploma in Unreal Engine Game Scene VFX Development (PDGD)",
      "Professional Diploma in GenAI for Executives & Business (PDAI)",
    ],
  },
];

export function CourseCreationRequestDialog({
  open,
  requesterId,
  onOpenChange,
}: CourseCreationRequestDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const facultyOptions = useMemo(
    () => FACULTY_PROGRAMME_OPTIONS.map((option) => option.faculty),
    [],
  );
  const programmeOptions = useMemo(
    () =>
      form.faculty
        ? FACULTY_PROGRAMME_OPTIONS.find(
            (option) => option.faculty === form.faculty,
          )?.programmes ?? []
        : [],
    [form.faculty],
  );

  useEffect(() => {
    if (!open) setForm(initialForm);
  }, [open]);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === "subjectCode" ? value.toUpperCase() : value,
    }));
  };

  const updateFaculty = (value: string) => {
    setForm((current) => ({
      ...current,
      faculty: value,
      programme: FACULTY_PROGRAMME_OPTIONS.find(
        (option) => option.faculty === value,
      )?.programmes.includes(current.programme)
        ? current.programme
        : "",
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!requesterId) return;

    const subjectCode = form.subjectCode.trim().toUpperCase();
    const subjectName = form.subjectName.trim();
    const reason = form.reason.trim();
    const credits = form.credits.trim() ? Number(form.credits) : null;

    if (!subjectCode || !subjectName || !reason) {
      notify.warning("Please enter the subject code, subject name, and reason.");
      return;
    }

    if (credits !== null && (!Number.isInteger(credits) || credits <= 0)) {
      notify.warning("Credits must be a positive whole number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("course_creation_requests").insert({
        requested_by: requesterId,
        subject_code: subjectCode,
        subject_name: subjectName,
        faculty: form.faculty.trim() || null,
        programme: form.programme.trim() || null,
        credits,
        reason,
      });

      if (error) throw error;

      notify.success("Course creation request submitted.");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit course creation request:", error);
      notify.error(error, "Failed to submit course creation request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request New Course Creation</DialogTitle>
          <DialogDescription>
            Submit a course request for admin review when it is not listed in the catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request-subject-code">Subject Code</Label>
              <Input
                id="request-subject-code"
                value={form.subjectCode}
                onChange={(event) =>
                  updateField("subjectCode", event.target.value)
                }
                placeholder="CSIS3083"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-credits">Credits</Label>
              <Input
                id="request-credits"
                type="number"
                min={1}
                step={1}
                value={form.credits}
                onChange={(event) => updateField("credits", event.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-subject-name">Subject Name</Label>
            <Input
              id="request-subject-name"
              value={form.subjectName}
              onChange={(event) =>
                updateField("subjectName", event.target.value)
              }
              placeholder="Ethics in Computing"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request-faculty">Faculty</Label>
              <Select value={form.faculty} onValueChange={updateFaculty}>
                <SelectTrigger id="request-faculty">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {facultyOptions.map((faculty) => (
                    <SelectItem key={faculty} value={faculty}>
                      {faculty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-programme">Programme</Label>
              <Select
                value={form.programme}
                onValueChange={(value) => updateField("programme", value)}
                disabled={!form.faculty}
              >
                <SelectTrigger id="request-programme">
                  <SelectValue
                    placeholder={
                      form.faculty ? "Select programme" : "Select faculty first"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {programmeOptions.map((programme) => (
                    <SelectItem key={programme} value={programme}>
                      {programme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-reason">Reason</Label>
            <Textarea
              id="request-reason"
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              placeholder="Explain why this course should be added to the catalog..."
              className="min-h-28"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
