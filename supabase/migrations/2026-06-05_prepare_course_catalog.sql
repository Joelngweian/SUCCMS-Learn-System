ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_code TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS chinese_name TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS faculty TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS programme TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_type TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS credit_hours INTEGER;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS max_capacity INTEGER;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS enrollment_key TEXT;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

ALTER TABLE public.courses
ALTER COLUMN lecturer_id DROP NOT NULL;

UPDATE public.courses
SET
  course_code = COALESCE(course_code, code),
  credit_hours = COALESCE(credit_hours, credits),
  max_capacity = COALESCE(max_capacity, max_students),
  status = COALESCE(status, 'open')
WHERE course_code IS NULL
   OR credit_hours IS NULL
   OR max_capacity IS NULL
   OR status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_course_code_unique
  ON public.courses(course_code)
  WHERE course_code IS NOT NULL;

INSERT INTO public.courses (
  code,
  course_code,
  name,
  description,
  chinese_name,
  faculty,
  programme,
  course_type,
  credit_hours,
  credits,
  max_capacity,
  max_students,
  enrollment_key,
  status,
  semester
) VALUES
  (
    'CS101',
    'CS101',
    'Programming Fundamentals',
    'Introduction to programming concepts, problem solving, and basic software development.',
    '程序设计基础',
    'Faculty of Computing and Information Technology',
    'Bachelor of Computer Science',
    'common_core',
    3,
    3,
    120,
    120,
    'CS101-2025',
    'open',
    '2025C'
  ),
  (
    'CS205',
    'CS205',
    'Data Structures',
    'Core data structures, algorithms, and implementation techniques.',
    '数据结构',
    'Faculty of Computing and Information Technology',
    'Bachelor of Computer Science',
    'discipline_core',
    3,
    3,
    100,
    100,
    'CS205-2025',
    'open',
    '2025C'
  ),
  (
    'CS220',
    'CS220',
    'Web Application Development',
    'Frontend and backend foundations for building modern web applications.',
    '网页应用开发',
    'Faculty of Computing and Information Technology',
    'Bachelor of Information Systems',
    'discipline_core',
    3,
    3,
    90,
    90,
    'CS220-2025',
    'open',
    '2025C'
  ),
  (
    'CS301',
    'CS301',
    'Database Systems',
    'Relational database design, SQL, normalization, and transaction management.',
    '数据库系统',
    'Faculty of Computing and Information Technology',
    'Bachelor of Information Systems',
    'discipline_core',
    3,
    3,
    90,
    90,
    'CS301-2025',
    'open',
    '2025C'
  ),
  (
    'CS330',
    'CS330',
    'Operating Systems',
    'Processes, memory, file systems, synchronization, and operating system design.',
    '操作系统',
    'Faculty of Computing and Information Technology',
    'Bachelor of Computer Science',
    'discipline_core',
    3,
    3,
    80,
    80,
    'CS330-2025',
    'open',
    '2025C'
  ),
  (
    'CS410',
    'CS410',
    'Software Engineering',
    'Requirements, design, testing, maintenance, and team-based software delivery.',
    '软件工程',
    'Faculty of Computing and Information Technology',
    'Bachelor of Software Engineering',
    'discipline_core',
    3,
    3,
    90,
    90,
    'CS410-2025',
    'open',
    '2025C'
  ),
  (
    'CS550',
    'CS550',
    'Advanced Database Systems',
    'Advanced query processing, database administration, and performance optimization.',
    '高级数据库系统',
    'Faculty of Computing and Information Technology',
    'Bachelor of Information Systems',
    'elective_core',
    3,
    3,
    60,
    60,
    'CS550-2025',
    'open',
    '2025C'
  ),
  (
    'IS201',
    'IS201',
    'Information Systems Analysis',
    'Business process analysis, system requirements, and information system planning.',
    '信息系统分析',
    'Faculty of Computing and Information Technology',
    'Bachelor of Information Systems',
    'common_core',
    3,
    3,
    100,
    100,
    'IS201-2025',
    'open',
    '2025C'
  )
ON CONFLICT (code) DO UPDATE
SET
  course_code = EXCLUDED.course_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  chinese_name = EXCLUDED.chinese_name,
  faculty = EXCLUDED.faculty,
  programme = EXCLUDED.programme,
  course_type = EXCLUDED.course_type,
  credit_hours = EXCLUDED.credit_hours,
  credits = EXCLUDED.credits,
  max_capacity = EXCLUDED.max_capacity,
  max_students = EXCLUDED.max_students,
  enrollment_key = EXCLUDED.enrollment_key,
  status = EXCLUDED.status,
  semester = EXCLUDED.semester;
