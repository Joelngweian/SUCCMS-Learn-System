export type StudyPlanProgrammeKey = "IT" | "CS" | "BOSE";
export type StudyPlanLevel = "Diploma" | "Bachelor";
export interface StudyPlanCourseEntry {
  programmeKey: StudyPlanProgrammeKey;
  programmeName: string;
  level: StudyPlanLevel;
  intakeYear: number;
  intakeSemester: "A" | "B" | "C";
  termCode: string;
  courseCode: string | null;
  courseName: string;
  category: string | null;
  creditHours: number | null;
  isPlaceholder: boolean;
  sourceFiles: string[];
  position: number;
  planCourseKey: string;
}

export interface AcademicTermCalendar {
  id?: string;
  code: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  enrollment_starts_at: string | null;
  enrollment_ends_at: string | null;
  status: string | null;
}

export const ACADEMIC_TERM_CALENDAR: AcademicTermCalendar[] = [
  { code: "2026A", name: "Semester A 2026", starts_at: "2026-03-02", ends_at: "2026-05-01", enrollment_starts_at: "2026-02-09", enrollment_ends_at: "2026-03-12", status: "closed" },
  { code: "2026B", name: "Semester B 2026", starts_at: "2026-05-25", ends_at: "2026-09-18", enrollment_starts_at: "2026-05-18", enrollment_ends_at: "2026-06-04", status: "active" },
  { code: "2026C", name: "Semester C 2026", starts_at: "2026-10-05", ends_at: "2027-01-29", enrollment_starts_at: "2026-09-28", enrollment_ends_at: "2026-10-15", status: "planned" },
  { code: "2027A", name: "Semester A 2027", starts_at: null, ends_at: null, enrollment_starts_at: "2027-02-15", enrollment_ends_at: "2027-02-26", status: "planned" },
];

export const STUDY_PLAN_COURSES: StudyPlanCourseEntry[] = [
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BTSE2003",
    "courseName": "Software Engineering",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx",
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BMIA1043",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx",
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BMIA1043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BTPR1003",
    "courseName": "Java Programming I",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "U1",
    "courseName": "MPU Subject U1 (Falsafah & Isu Semasa)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U1-FALSAFAH-ISU-SEMASA-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "BTPR2033",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx",
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 6,
    "planCourseKey": "BTPR2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "BTIS1013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "BTSE2123",
    "courseName": "Software Testing",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "U2",
    "courseName": "MPU Subject U2",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U2-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "U3",
    "courseName": "MPU Subject U3 (Malaysia's Multiethnic & Cultural Society)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U3-MALAYSIA-S-MULTIETHNIC-CULTURAL-SOCIETY-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTSE2113",
    "courseName": "Software Quality",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx",
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTIS2013",
    "courseName": "Database Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTSE1003",
    "courseName": "Object-Oriented System Modeling and Analysis",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "BTSE2163",
    "courseName": "Software Requirement",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTSE2163"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTIS2053",
    "courseName": "Introduction to Networks and Communication Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS2053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "U1",
    "courseName": "MPU Subject U1 (Falsafah & Isu Semasa)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U1-FALSAFAH-ISU-SEMASA-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTSE2043",
    "courseName": "Software Process",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTSE2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "AMPU3263",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 4,
    "planCourseKey": "AMPU3263"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTIS3013",
    "courseName": "Operating System",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTIS3013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTIS2033",
    "courseName": "Project Mangement",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "BTSE2123",
    "courseName": "Software Testing",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "U3",
    "courseName": "MPU Subject U3 (Malaysia's Multiethnic & Cultural Society)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U3-MALAYSIA-S-MULTIETHNIC-CULTURAL-SOCIETY-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "U2",
    "courseName": "MPU Subject U2 (Chinese Calligraphy/ Bahasa Kebangsaan A)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U2-CHINESE-CALLIGRAPHY-BAHASA-KEBANGSAAN-A-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTPR1103",
    "courseName": "Java Programming II",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR1103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTPR2013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx",
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization) / Any U2 or U3 (Exemption)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-ANY-U2-OR-U3-EXEMPTION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTSE2043",
    "courseName": "Software Process",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTSE2163",
    "courseName": "Software Requirements",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2163"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C2 Study Plan_V3.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I (C Sem)",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "BTIS2073",
    "courseName": "Information Security and Assurance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "BTIS2043",
    "courseName": "Computer Organization and Architecture",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "BTPR2123",
    "courseName": "Object-Oriented Programming",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II (C Sem)",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "BTIS3043",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS3043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "BTIS3073",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTIS3073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2024C1 study plan_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "BTIS1013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "U3",
    "courseName": "MPU Subject U3 (Malaysia's Multiethnic & Cultural Society)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U3-MALAYSIA-S-MULTIETHNIC-CULTURAL-SOCIETY-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "U2",
    "courseName": "MPU Subject U2",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U2-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BTSE2003",
    "courseName": "Software Engineering",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "HMPU3313",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "HMPU3313"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BTIS2013",
    "courseName": "Database Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BTSE1003",
    "courseName": "Object-Oriented System Modeling and Analysis",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BMIA1043",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BMIA1043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BTPR1003",
    "courseName": "Java Programming I",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "U1",
    "courseName": "MPU Subject U1 (Falsafah & Isu Semasa)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U1-FALSAFAH-ISU-SEMASA-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "BTPR2033",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTSE2123",
    "courseName": "Software Testing",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTPR1103",
    "courseName": "Java Programming II",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR1103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTPR2013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization) / Any U2 or U3 (Exemption)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-ANY-U2-OR-U3-EXEMPTION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTSE2163",
    "courseName": "Software Requirements",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2163"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTSE2113",
    "courseName": "Software Quality",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "BTSE2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTIS2053",
    "courseName": "Introduction to Networks and Communication Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS2053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "AMPU3263",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "AMPU3263"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTIS3013",
    "courseName": "Operating System",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS3013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTIS2033",
    "courseName": "Project Management",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTIS2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTPR2013",
    "courseName": "Information Security and Assurance (CS)",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTSE2043",
    "courseName": "Software Process",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx",
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTSE2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A2 Study Plan V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTIS2043",
    "courseName": "Computer Organization and Architecture",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTPR2123",
    "courseName": "Object-Oriented Programming",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTIS3043",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS3043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTIS3073",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTIS3073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS2073",
    "courseName": "Information Security and Assurance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE2025A1 study plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTIS1013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "U3",
    "courseName": "MPU Subject U3 (Malaysia's Multiethnic & Cultural Society)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U3-MALAYSIA-S-MULTIETHNIC-CULTURAL-SOCIETY-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTSE2003",
    "courseName": "Software Engineering",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "HMPU3313",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "HMPU3313"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTIS2013",
    "courseName": "Database Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTSE1003",
    "courseName": "Object-Oriented System Modeling and Analysis",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BTIS3073",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTIS3073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "U2",
    "courseName": "MPU Subject U2",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U2-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BMIA1043",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BMIA1043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTPR1003",
    "courseName": "Java Programming I",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR1003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "U1",
    "courseName": "MPU Subject U1 (Falsafah & Isu Semasa)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U1-FALSAFAH-ISU-SEMASA-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BCBC1003/BCIC1013",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "BTPR2033",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization) / Any U2 or U3 (Exemption)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-ANY-U2-OR-U3-EXEMPTION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTSE2123",
    "courseName": "Software Testing",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTPR1103",
    "courseName": "Java Programming II",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR1103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTPR2013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTSE2163",
    "courseName": "Software Requirements",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2163"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "BTSE2113",
    "courseName": "Software Quality",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "BTSE2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS3013",
    "courseName": "Operating System",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "AMPU3263",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "AMPU3263"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS2033",
    "courseName": "Project Management",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTSE2043",
    "courseName": "Software Process",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx",
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS2053",
    "courseName": "Introduction to Networks and Communication Systems",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS2053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTPR2013",
    "courseName": "Information Security and Assurance (CS)",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "BTIS3073",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "BTIS3073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A2 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "BTIS2043",
    "courseName": "Computer Organization and Architecture",
    "category": "Core Computing",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028B",
    "courseCode": "BTPR2123",
    "courseName": "Object-Oriented Programming",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTPR2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028B",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028B",
    "courseCode": "BTIS3043",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTIS3043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028C",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028C",
    "courseCode": "BTIS2073",
    "courseName": "Information Security and Assurance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2073"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028C",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2029A",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoSE 2026 A1 Study Plan Version 2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "HMPU3313",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "HMPU3313"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "BTSE2003",
    "courseName": "Software Engineering",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTSE2003"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "U4",
    "courseName": "MPU Subject U4",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U4-2"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "BBMK3113",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BBMK3113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "U1",
    "courseName": "MPU U1 (Appreciation of Ethics and Civilization) / Any U2 or U3 (Exemption)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-U1-APPRECIATION-OF-ETHICS-AND-CIVILIZATION-ANY-U2-OR-U3-EXEMPTION-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "U2",
    "courseName": "MPU Subject U2",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U2-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "BTSE2133",
    "courseName": "Software Design",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2133"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "U1",
    "courseName": "MPU Subject U1 (Falsafah & Isu Semasa)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U1-FALSAFAH-ISU-SEMASA-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "BTPR2113",
    "courseName": "Web Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "BTPR2033",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTPR2033"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "BTPR2013",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "U3",
    "courseName": "MPU Subject U3 (Malaysia's Multiethnic & Cultural Society)",
    "category": "MPU",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-U3-MALAYSIA-S-MULTIETHNIC-CULTURAL-SOCIETY-3"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "BTIS2083",
    "courseName": "Field Elective",
    "category": "Field Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTIS2083"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "BTIS3103",
    "courseName": "Final Year Project I",
    "category": "FY Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3103"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "BGEN1013",
    "courseName": "Academic English",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BGEN1013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "BTSE2113",
    "courseName": "Software Quality",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTSE2113"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "BTSE2163",
    "courseName": "Software Requirement",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2163"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "BTIS3053",
    "courseName": "Social and Professional Issues",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTIS3053"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "BTIS3204",
    "courseName": "Final Year Project II",
    "category": "FY Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTIS3204"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "BTSE2043",
    "courseName": "Software Process",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTSE2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "AMPU3263",
    "courseName": "Free Elective",
    "category": "Free Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "AMPU3263"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "BTSE2153",
    "courseName": "Software Evolution and Maintenance",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 4,
    "planCourseKey": "BTSE2153"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "BTPR2013",
    "courseName": "Information Security and Assurance (CS)",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 5,
    "planCourseKey": "BTPR2013"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "BTSE2123",
    "courseName": "Software Testing",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTSE2123"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "BTPR3203",
    "courseName": "Python for Data Science",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 2,
    "planCourseKey": "BTPR3203"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "BTPR2043",
    "courseName": "Mobile Application Development",
    "category": "Dicipline Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 3,
    "planCourseKey": "BTPR2043"
  },
  {
    "programmeKey": "BOSE",
    "programmeName": "Bachelor of Software Engineering (Honours)",
    "level": "Bachelor",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028B",
    "courseCode": "BTID3006",
    "courseName": "Industrial Training",
    "category": "Industrial Training",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "BoS26 B2 Study Plan.xlsx"
    ],
    "position": 1,
    "planCourseKey": "BTID3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies (Pengajian Moral)",
    "category": "MPU U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CHIN1003/CHIN2163",
    "courseName": "Basic Chinese/Intro to Chinese Culture",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilizations",
    "category": "U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "MPU2233",
    "courseName": "Critical Thinking Skills",
    "category": "U2",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2233"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "U4",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "ENGL2113",
    "courseName": "Communicative  English",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "ENGL2113"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "PROG2033",
    "courseName": "Elective Subject",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3044",
    "courseName": "Project (Sem C)",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "CSIS3043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2024C_V2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilizations",
    "category": "U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core / Dicipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "MPU2233",
    "courseName": "Critical Thinking Skills",
    "category": "U2",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2233"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/ Chinese OR Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "U4",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies (Pengajian Moral)",
    "category": "U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS3083",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG2043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS3044",
    "courseName": "Project (Sem A and B)",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Elective Compulsory",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "U2",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": null,
    "courseName": "Basic Chinese/ Chinese/ Introduction to Chinese Culture OR Elective",
    "category": "Compulsory",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-INTRODUCTION-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "U4",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "U3",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": null,
    "courseName": "Elective Subject",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG2043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS3044",
    "courseName": "Project (Sem A and B)",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": null,
    "courseName": "Elective Subject",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U3",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS3044",
    "courseName": "Project",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS3043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "CSIS3043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilizations (Local)",
    "category": "U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "MPU2223/MPU2213",
    "courseName": "Introduction to Mass Communication/ Bahasa Kebangsaan A",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-INTRODUCTION-TO-MASS-COMMUNICATION-BAHASA-KEBANGSAAN-A-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies (Pengajian Moral)",
    "category": "U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS3083",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "PROG2043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS3044",
    "courseName": "Project",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Elective Compulsory",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG1013",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "MPU2223/MPU2213",
    "courseName": "Introduction to Mass Communication/ Bahasa Kebangsaan A",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-INTRODUCTION-TO-MASS-COMMUNICATION-BAHASA-KEBANGSAAN-A-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilisation",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies (Pengajian Moral)",
    "category": "U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3083",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "PROG2043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS3044",
    "courseName": "Project",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Elective Compulsory",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028B",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "PROG1114",
    "courseName": "Introduction to Programming",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U3",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "CSIS1003",
    "courseName": "Computer System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1003"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "CSIS3053",
    "courseName": "Fundamental of Artificial Intelligence",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3053"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "PROG1114",
    "courseName": "Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "MATH1043",
    "courseName": "Calculus",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U2",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "PROG2114",
    "courseName": "Advanced Java Programming",
    "category": "Discipline",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2114"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS3044",
    "courseName": "Project",
    "category": "Project",
    "creditHours": 4,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3044"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS3043",
    "courseName": "Distributed Database System",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3043"
  },
  {
    "programmeKey": "CS",
    "programmeName": "Diploma in Computer Science",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "CS 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "CHIN1003/CHIN2163",
    "courseName": "Basic Chinese/Intro to Chinese Culture",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2024C",
    "courseCode": "U4",
    "courseName": "MPU Subject",
    "category": "MPU",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "MPU2233",
    "courseName": "Critical Thinking Skills",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2233"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "ENGL2113",
    "courseName": "Communicative  English",
    "category": "Coll Compl/ Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "ENGL2113"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS3023",
    "courseName": "Software Engineering",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2024,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2024C_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "MPU2183",
    "courseName": "Penghayatan Etika dan Peradaban (local) (U1)",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025A",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies",
    "category": "MPU U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "MPU2233",
    "courseName": "Critical Thinking Skills",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2233"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "CHIN1003/CHIN2163",
    "courseName": "Basic Chinese/Intro to Chinese Culture OR Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-INTRO-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "ENGL2113",
    "courseName": "Communicative  English",
    "category": "Elective Coll Compl",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "ENGL2113"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2025C",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS3023",
    "courseName": "Software Engineering",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025A_v2.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": null,
    "courseName": "Basic Chinese/ Chinese/ Introduction to Chinese Culture OR Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-INTRODUCTION-TO-CHINESE-CULTURE-OR-ELECTIVE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2025C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS3023",
    "courseName": "Software Engineering",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "CSIS3023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2025C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2025,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2025C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilisation (Local)",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026A",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies",
    "category": "MPU U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "MPU2223",
    "courseName": "Introduction to Mass Communication",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2223"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026B",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "ENGL2113",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "ENGL2113"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2026C",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "CSIS3023",
    "courseName": "Software Engineering",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "A",
    "termCode": "2028A",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026A.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "MPU2223",
    "courseName": "Introduction to Mass Communication",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2223"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026B",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "ENGL2113",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "ENGL2113"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2026C",
    "courseCode": "KMPU2432",
    "courseName": "Integrity and Anti-Corruption",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "KMPU2432"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "MPU2183",
    "courseName": "Appreciation of Ethics and Civilisation (Local)",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MPU2183"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027A",
    "courseCode": "MPU2323",
    "courseName": "Moral Studies",
    "category": "MPU U3",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MPU2323"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "CSIS3023",
    "courseName": "Software Engineering",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS3023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "B",
    "termCode": "2028B",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026B.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "PROG1003",
    "courseName": "Fundamentals of Software Design and Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2013",
    "courseName": "System Analysis and Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CSIS2023",
    "courseName": "Database System Design",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "MATH1033",
    "courseName": "Discrete Mathematics",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "MATH1033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": "CHIN1003/CHIN1033",
    "courseName": "Basic Chinese/Chinese",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-BASIC-CHINESE-CHINESE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2026C",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U4",
    "creditHours": 2,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-2"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": "CSIS1013",
    "courseName": "Internet Application",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027A",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U1",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "PROG1103",
    "courseName": "Software Development",
    "category": "Core / Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG1103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "MATH1023",
    "courseName": "Calculus and Algebra",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "MATH1023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": null,
    "courseName": "MPU Subject",
    "category": "MPU U2",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PLACEHOLDER-MPU-SUBJECT-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "PROG2023",
    "courseName": "Introduction to Cloud Computing",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "PROG2023"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": "CSIS2063",
    "courseName": "Project Management",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2063"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027B",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "PROG2013",
    "courseName": "Object-Oriented Programming",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS3003",
    "courseName": "Project I",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3003"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "MATH1013",
    "courseName": "Statistics and Probability",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "MATH1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS3013",
    "courseName": "System Security and Control",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "CSIS2083",
    "courseName": "Computer Organization and Architecture",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "CSIS2083"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2027C",
    "courseCode": "DGEN1013",
    "courseName": "Communicative  English",
    "category": "Compulsory Elective",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "DGEN1013"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": "PROG2103",
    "courseName": "Data Structure and Algorithm",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "PROG2103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": "CSIS2033",
    "courseName": "Networking and Distributed System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028A",
    "courseCode": "PROG2033",
    "courseName": "Mobile Application Development",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "PROG2033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS2073",
    "courseName": "Web-Based Systems",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS2073"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS3103",
    "courseName": "Project II",
    "category": "Project",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 2,
    "planCourseKey": "CSIS3103"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS2093",
    "courseName": "Operating System",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 3,
    "planCourseKey": "CSIS2093"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "CSIS3033",
    "courseName": "Ethics in Computing",
    "category": "Core",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 4,
    "planCourseKey": "CSIS3033"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": null,
    "courseName": "Elective",
    "category": "Elective",
    "creditHours": 3,
    "isPlaceholder": true,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 5,
    "planCourseKey": "PLACEHOLDER-ELECTIVE-3"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028B",
    "courseCode": "PROG2203",
    "courseName": "Human Computer Interaction",
    "category": "Discipline",
    "creditHours": 3,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 6,
    "planCourseKey": "PROG2203"
  },
  {
    "programmeKey": "IT",
    "programmeName": "Diploma in Information Technology",
    "level": "Diploma",
    "intakeYear": 2026,
    "intakeSemester": "C",
    "termCode": "2028C",
    "courseCode": "CSIS3006",
    "courseName": "Industrial Training",
    "category": "Core",
    "creditHours": 6,
    "isPlaceholder": false,
    "sourceFiles": [
      "IT 2026C.xlsx"
    ],
    "position": 1,
    "planCourseKey": "CSIS3006"
  }
];


const TERM_SEQUENCE = ["A", "B", "C"] as const;

const getSemesterIndex = (year: number, semester: string) =>
  year * 3 + TERM_SEQUENCE.indexOf(semester as "A" | "B" | "C");

const parseTermCode = (termCode: string) => {
  const match = /^(\d{4})([ABC])$/.exec(termCode.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), semester: match[2] as "A" | "B" | "C" };
};

const compareTermCodes = (left: string, right: string) => {
  const parsedLeft = parseTermCode(left);
  const parsedRight = parseTermCode(right);
  if (!parsedLeft || !parsedRight) return left.localeCompare(right);
  return parsedRight.year - parsedLeft.year
    || "ABC".indexOf(parsedRight.semester) - "ABC".indexOf(parsedLeft.semester);
};

const isDateWithin = (date: Date, start: string | null, end: string | null) => {
  if (!start || !end) return false;
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return current >= Date.parse(`${start}T00:00:00Z`) && current <= Date.parse(`${end}T23:59:59Z`);
};

export function getFallbackCurrentAcademicTerm(now = new Date()): AcademicTermCalendar {
  const ranked = ACADEMIC_TERM_CALENDAR
    .map(term => {
      const enrollmentMatch = isDateWithin(now, term.enrollment_starts_at, term.enrollment_ends_at);
      const teachingMatch = isDateWithin(now, term.starts_at, term.ends_at);
      const enrollmentStart = term.enrollment_starts_at ? Date.parse(`${term.enrollment_starts_at}T00:00:00Z`) : Number.POSITIVE_INFINITY;
      const teachingStart = term.starts_at ? Date.parse(`${term.starts_at}T00:00:00Z`) : Number.POSITIVE_INFINITY;
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        term,
        rank: enrollmentMatch ? 0 : teachingMatch ? 1 : enrollmentStart >= today ? 2 : teachingStart >= today ? 3 : 4,
        sortDate: enrollmentStart >= today ? enrollmentStart : teachingStart >= today ? teachingStart : -Math.max(enrollmentStart, teachingStart),
      };
    })
    .sort((left, right) => left.rank - right.rank || left.sortDate - right.sortDate);

  return ranked[0]?.term || ACADEMIC_TERM_CALENDAR[0];
}

export function getProgrammeKeyFromProgramme(programme?: string | null): StudyPlanProgrammeKey | null {
  const value = (programme || "").toLowerCase();
  if (value.includes("software engineering")) return "BOSE";
  if (value.includes("information technology")) return "IT";
  if (value.includes("computer science")) return "CS";
  return null;
}

export function parseStudentIdFromEmail(email?: string | null) {
  const localPart = (email || "").split("@")[0]?.trim().toUpperCase() || "";
  const match = /^([DB])(\d{2})\d{4}([ABC])$/.exec(localPart);
  if (!match) return null;
  return {
    id: localPart,
    level: match[1] === "B" ? "Bachelor" as const : "Diploma" as const,
    intakeYear: 2000 + Number(match[2]),
    intakeSemester: match[3] as "A" | "B" | "C",
  };
}

export function isConcreteStudyPlanEntry(entry: StudyPlanCourseEntry) {
  return Boolean(entry.courseCode && !entry.isPlaceholder);
}

export function getStudyPlanCoursesForStudent({
  email,
  programme,
  termCode,
}: {
  email?: string | null;
  programme?: string | null;
  termCode: string;
}) {
  const programmeKey = getProgrammeKeyFromProgramme(programme);
  const studentId = parseStudentIdFromEmail(email);
  if (!programmeKey || !studentId) {
    return {
      entries: [] as StudyPlanCourseEntry[],
      programmeKey,
      studentId,
      isExactMatch: false,
      message: !programmeKey
        ? "No supported study plan is linked to this programme yet."
        : "The student ID in the email could not be parsed.",
    };
  }

  const exactEntries = STUDY_PLAN_COURSES.filter(entry =>
    entry.programmeKey === programmeKey
    && entry.level === studentId.level
    && entry.intakeYear === studentId.intakeYear
    && entry.intakeSemester === studentId.intakeSemester
    && entry.termCode === termCode,
  );

  if (exactEntries.length > 0) {
    return {
      entries: exactEntries,
      programmeKey,
      studentId,
      isExactMatch: true,
      message: null as string | null,
    };
  }

  const targetTerm = parseTermCode(termCode);
  const candidates = STUDY_PLAN_COURSES.filter(entry =>
    entry.programmeKey === programmeKey
    && entry.level === studentId.level
    && entry.termCode === termCode,
  );

  if (candidates.length === 0 || !targetTerm) {
    return {
      entries: [] as StudyPlanCourseEntry[],
      programmeKey,
      studentId,
      isExactMatch: false,
      message: `No ${termCode} study plan courses were found for this programme.`,
    };
  }

  const studentStartIndex = getSemesterIndex(studentId.intakeYear, studentId.intakeSemester);
  const grouped = new Map<string, { distance: number; entries: StudyPlanCourseEntry[] }>();
  candidates.forEach(entry => {
    const key = `${entry.intakeYear}${entry.intakeSemester}`;
    const entryStartIndex = getSemesterIndex(entry.intakeYear, entry.intakeSemester);
    const distance = Math.abs(entryStartIndex - studentStartIndex);
    const current = grouped.get(key);
    if (!current) grouped.set(key, { distance, entries: [entry] });
    else current.entries.push(entry);
  });

  const closest = Array.from(grouped.entries()).sort(
    (left, right) => left[1].distance - right[1].distance || left[0].localeCompare(right[0]),
  )[0];

  return {
    entries: closest?.[1].entries || [],
    programmeKey,
    studentId,
    isExactMatch: false,
    message: closest
      ? `Exact ${studentId.intakeYear}${studentId.intakeSemester} study plan is not imported, so the closest available plan ${closest[0]} is shown.`
      : `No study plan courses were found for ${termCode}.`,
  };
}

export function getStudyPlanCoursesForTerm(termCode: string) {
  const seen = new Set<string>();
  return STUDY_PLAN_COURSES.filter(entry => entry.termCode === termCode)
    .filter(entry => {
      const key = entry.courseCode || `${entry.programmeKey}-${entry.planCourseKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getStudyPlanTermCodes() {
  return Array.from(new Set(STUDY_PLAN_COURSES.map(entry => entry.termCode)))
    .sort(compareTermCodes);
}
