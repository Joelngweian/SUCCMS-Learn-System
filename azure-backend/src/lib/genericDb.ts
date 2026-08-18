import { getPool } from "./db";
import { broadcastTableChanges } from "./realtime";
import type { AuthenticatedUser } from "../types/auth";

type QueryFilter = {
  column: string;
  operator: string;
  value: unknown;
};

type QueryOrder = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

type QueryPayload = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  select?: string;
  values?: unknown;
  filters?: QueryFilter[];
  orders?: QueryOrder[];
  limit?: number;
  range?: { from: number; to: number };
  single?: "single" | "maybeSingle";
  count?: "exact" | null;
  head?: boolean;
  options?: Record<string, unknown>;
};

type MutationAction = "insert" | "update" | "upsert" | "delete";

export class AuthorizationError extends Error {
  constructor(message = "This action is not allowed.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

const allowedTables = new Set([
  "academic_terms",
  "active_stories_summary",
  "ai_grading_jobs",
  "ai_recommendation_preferences",
  "announcement_reads",
  "announcements",
  "assignment_marking_guides",
  "assignment_submissions",
  "assignments",
  "attendance",
  "attendance_class_meetings",
  "attendance_sessions",
  "campus_post_comments",
  "campus_post_mentions",
  "campus_post_reactions",
  "campus_posts",
  "course_assessment_items",
  "course_enrollments",
  "course_instructors",
  "course_materials",
  "course_offerings",
  "course_posts",
  "course_summary",
  "courses",
  "follows",
  "forum_reactions",
  "forum_replies",
  "forum_reply_reactions",
  "forum_threads",
  "leaderboard",
  "login_history",
  "notifications",
  "presence_summary_cache",
  "reports",
  "shared_cache_entries",
  "social_activity_events",
  "stories",
  "story_views",
  "student_gpa",
  "student_grades",
  "student_study_plan_assignments",
  "student_xp_summary",
  "study_group_members",
  "study_group_posts",
  "study_group_session_attendees",
  "study_group_sessions",
  "study_groups",
  "study_plan_courses",
  "study_plan_versions",
  "user_achievements",
  "user_presence",
  "user_profiles",
  "user_settings",
  "weekly_xp_summary",
  "xp_events"
]);

const allowedRpcs = new Set([
  "add_study_group_member",
  "check_in_attendance",
  "correct_attendance_session_date",
  "create_course_offering_with_assessment",
  "create_study_group",
  "delete_user_account",
  "drop_course_offering",
  "enroll_student_in_course",
  "get_assignment_peer_benchmarks",
  "get_available_course_offerings",
  "get_campus_posts_page",
  "get_course_catalog_summary",
  "get_course_members",
  "get_course_posts_page",
  "get_current_enrollment_term",
  "get_lecturer_analytics",
  "get_my_xp_progress",
  "get_my_upcoming_study_sessions",
  "get_profile_visibility",
  "get_social_activity_feed",
  "get_student_dashboard_data",
  "get_study_group_member_candidates",
  "get_study_groups",
  "get_weekly_xp_leaderboard",
  "join_study_group",
  "leave_study_group",
  "remove_study_group_member",
  "search_campus_mention_courses",
  "set_study_session_attendance",
  "save_course_assessment_structure",
  "staff_assign_course_offering",
  "staff_assign_student_study_plan",
  "staff_list_assignable_students",
  "staff_list_lecturer_options",
  "staff_unassign_student_study_plan",
  "staff_upsert_academic_terms"
]);

const columnPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function runGenericQuery(payload: QueryPayload, user: AuthenticatedUser) {
  assertAllowedTable(payload.table);
  const filters = payload.filters || [];
  const values: unknown[] = [];

  if (payload.action === "select") {
    const columns = buildSelectColumns(payload.select);
    const where = buildWhere(payload.table, filters, values);
    const order = buildOrder(payload.orders || []);
    const limit = buildLimit(payload);
    const sql = `SELECT ${columns} FROM public.${quoteIdent(payload.table)}${where}${order}${limit}`;
    const result = await getPool().query(sql, values);
    const rows = await hydrateRows(payload.table, result.rows, payload.select || "*");
    const data = normalizeData(rows, payload.single);
    const count = payload.count === "exact"
      ? await countRows(payload.table, filters)
      : undefined;
    return { data: payload.head ? null : data, count };
  }

  if (payload.action === "insert") {
    const rows = normalizeRows(payload.values);
    if (rows.length === 0) return { data: [] };
    await assertMutationAllowed(payload.table, "insert", rows, user);
    const result = await insertRows(payload.table, rows);
    const hydratedRows = await hydrateRows(payload.table, result.rows, payload.select || "*");
    void broadcastTableChanges(payload.table, "INSERT", result.rows);
    return { data: normalizeMutationData(hydratedRows, payload.single) };
  }

  if (payload.action === "upsert") {
    const rows = normalizeRows(payload.values);
    if (rows.length === 0) return { data: [] };
    await assertMutationAllowed(payload.table, "upsert", rows, user);
    const onConflict = await getUpsertConflictTarget(payload.table, payload.options?.onConflict);
    const result = await upsertRows(payload.table, rows, onConflict);
    const hydratedRows = await hydrateRows(payload.table, result.rows, payload.select || "*");
    void broadcastTableChanges(payload.table, "UPDATE", result.rows);
    return { data: normalizeMutationData(hydratedRows, payload.single) };
  }

  if (payload.action === "update") {
    const row = normalizeSingleObject(payload.values);
    await assertMutationAllowed(payload.table, "update", await loadTargetRows(payload.table, filters), user, row);
    const result = await updateRows(payload.table, row, filters);
    const hydratedRows = await hydrateRows(payload.table, result.rows, payload.select || "*");
    void broadcastTableChanges(payload.table, "UPDATE", result.rows);
    return { data: normalizeMutationData(hydratedRows, payload.single) };
  }

  if (payload.action === "delete") {
    await assertMutationAllowed(payload.table, "delete", await loadTargetRows(payload.table, filters), user);
    const result = await deleteRows(payload.table, filters);
    const hydratedRows = await hydrateRows(payload.table, result.rows, payload.select || "*");
    void broadcastTableChanges(payload.table, "DELETE", result.rows);
    return { data: hydratedRows };
  }

  throw new Error("Unsupported query action.");
}

export async function runGenericRpc(name: string, args: Record<string, unknown> = {}, user: AuthenticatedUser) {
  if (!allowedRpcs.has(name)) {
    throw new Error(`RPC "${name}" is not enabled on Azure.`);
  }
  assertRpcAllowed(name, args, user);
  const keys = Object.keys(args).sort();
  const values = keys.map(key => args[key]);
  const assignments = keys.map((key, index) => `${quoteIdent(key)} => $${index + 1}`).join(", ");
  const sql = `SELECT * FROM public.${quoteIdent(name)}(${assignments})`;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const claims = JSON.stringify({
      ...user.claims,
      sub: user.id,
      email: user.email || "",
      name: user.fullName || "",
      role: "authenticated",
      app_role: user.role || "student",
    });
    await client.query(
      `
        SELECT
          set_config('request.jwt.claim.sub', $1, true),
          set_config('request.jwt.claim.email', $2, true),
          set_config('request.jwt.claim.role', $3, true),
          set_config('request.jwt.claims', $4, true)
      `,
      [user.id, user.email || "", "authenticated", claims]
    );
    const result = await client.query(sql, values);
    await client.query("COMMIT");
    return { data: result.rows };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const academicContentTables = new Set([
  "academic_terms",
  "announcements",
  "assignment_marking_guides",
  "assignments",
  "attendance_class_meetings",
  "attendance_sessions",
  "course_assessment_items",
  "course_instructors",
  "course_materials",
  "course_offerings",
  "courses"
]);

const systemManagedTables = new Set([
  "active_stories_summary",
  "course_summary",
  "leaderboard",
  "presence_summary_cache",
  "shared_cache_entries",
  "social_activity_events",
  "student_gpa",
  "student_grades",
  "student_xp_summary",
  "weekly_xp_summary"
]);

const selfOwnedTables = new Set([
  "ai_recommendation_preferences",
  "announcement_reads",
  "campus_post_comments",
  "campus_post_mentions",
  "campus_post_reactions",
  "campus_posts",
  "course_posts",
  "follows",
  "forum_reactions",
  "forum_replies",
  "forum_reply_reactions",
  "forum_threads",
  "login_history",
  "notifications",
  "stories",
  "story_views",
  "study_plan_courses",
  "study_plan_versions",
  "user_achievements",
  "user_presence",
  "user_settings",
  "xp_events"
]);

async function assertMutationAllowed(
  table: string,
  action: MutationAction,
  rows: Record<string, unknown>[],
  user: AuthenticatedUser,
  patch: Record<string, unknown> = {}
) {
  if (isPrivileged(user)) return;

  if (systemManagedTables.has(table)) {
    throw new AuthorizationError("Only staff can change system-managed records.");
  }

  if (academicContentTables.has(table)) {
    if (
      user.role === "lecturer" &&
      await canManageAcademicContentRows(table, rows, user, patch)
    ) {
      return;
    }
    throw new AuthorizationError("Only lecturers or staff can change course content.");
  }

  if (table === "user_profiles") {
    assertNoProtectedProfileFields(patch);
    rows.forEach(row => assertOwnRecord(row, user, ["id"]));
    return;
  }

  if (table === "assignment_submissions" || table === "attendance" || table === "course_enrollments") {
    if (
      isTeachingUser(user) &&
      await canManageAcademicRows(table, rows, user, patch)
    ) {
      return;
    }
    rows.forEach(row => assertOwnRecord(row, user, ["student_id", "user_id"]));
    return;
  }

  if (table === "reports") {
    if (action === "insert") return;
    throw new AuthorizationError("Only staff can update reports.");
  }

  if (table === "ai_grading_jobs") {
    if (isTeachingUser(user)) return;
    throw new AuthorizationError("Only lecturers or staff can manage AI grading jobs.");
  }

  if (table === "study_groups") {
    if (action === "insert") {
      rows.forEach(row => assertOwnRecord(row, user, ["owner_id", "created_by"]));
      return;
    }
    rows.forEach(row => assertOwnRecord(row, user, ["owner_id", "created_by"]));
    return;
  }

  if (table.startsWith("study_group_")) {
    await assertStudyGroupMutationAllowed(table, action, rows, user);
    return;
  }

  if (selfOwnedTables.has(table)) {
    rows.forEach(row => assertOwnRecord(row, user, [
      "author_id",
      "created_by",
      "follower_id",
      "recipient_id",
      "student_id",
      "user_id",
      "viewed_by",
      "viewer_id"
    ]));
    return;
  }

  throw new AuthorizationError("This table can only be changed by staff on Azure.");
}

function assertRpcAllowed(name: string, args: Record<string, unknown>, user: AuthenticatedUser) {
  if (isPrivileged(user)) return;

  const teachingOnlyRpcs = new Set([
    "correct_attendance_session_date",
    "create_course_offering_with_assessment",
    "drop_course_offering",
    "get_lecturer_analytics",
    "save_course_assessment_structure"
  ]);

  if (teachingOnlyRpcs.has(name)) {
    if (isTeachingUser(user)) return;
    throw new AuthorizationError("Only lecturers or staff can run this action.");
  }

  if (name.startsWith("staff_")) {
    throw new AuthorizationError("Only staff can run this action.");
  }

  if (name === "delete_user_account") {
    const targetUserId = getString(args, "user_id", "target_user_id", "p_user_id");
    if (targetUserId && targetUserId !== user.id) {
      throw new AuthorizationError("You can only delete your own account.");
    }
  }
}

async function canManageAcademicRows(
  table: string,
  rows: Record<string, unknown>[],
  user: AuthenticatedUser,
  patch: Record<string, unknown>
) {
  if (table === "assignment_submissions") {
    const assignmentIds = uniqueStrings([
      ...rows.map(row => row.assignment_id),
      patch.assignment_id
    ]);
    if (assignmentIds.length === 0) return false;
    return canManageAssignmentIds(user.id, assignmentIds);
  }

  const courseIds = uniqueStrings([
    ...rows.map(row => row.course_id),
    patch.course_id
  ]);
  if (courseIds.length === 0) return false;
  return canManageCourseIds(user.id, courseIds);
}

async function canManageAcademicContentRows(
  table: string,
  rows: Record<string, unknown>[],
  user: AuthenticatedUser,
  patch: Record<string, unknown>
) {
  if (table === "assignment_marking_guides") {
    const assignmentIds = uniqueStrings([
      ...rows.map(row => row.assignment_id),
      patch.assignment_id
    ]);
    if (assignmentIds.length === 0) return false;
    return canManageAssignmentIds(user.id, assignmentIds);
  }

  const courseScopedTables = new Set([
    "assignments",
    "attendance_class_meetings",
    "attendance_sessions",
    "course_assessment_items",
    "course_materials"
  ]);

  if (!courseScopedTables.has(table)) return false;

  const courseIds = uniqueStrings([
    ...rows.map(row => row.course_id),
    patch.course_id
  ]);
  if (courseIds.length === 0) return false;
  return canManageCourseIds(user.id, courseIds);
}

async function canManageAssignmentIds(userId: string, assignmentIds: string[]) {
  const result = await getPool().query<{ course_id: string }>(
    `
      SELECT DISTINCT course_id
      FROM public.assignments
      WHERE id = ANY($1)
        AND (
          created_by = $2
          OR course_id IN (
            SELECT id FROM public.course_offerings WHERE owner_id = $2
            UNION
            SELECT course_id FROM public.course_instructors WHERE user_id = $2
          )
        )
    `,
    [assignmentIds, userId]
  );
  return result.rows.length === assignmentIds.length;
}

async function canManageCourseIds(userId: string, courseIds: string[]) {
  const uniqueCourseIds = uniqueStrings(courseIds);
  if (uniqueCourseIds.length === 0) return false;

  const result = await getPool().query<{ course_id: string }>(
    `
      SELECT DISTINCT id AS course_id
      FROM public.course_offerings
      WHERE id = ANY($1)
        AND owner_id = $2
      UNION
      SELECT DISTINCT course_id
      FROM public.course_instructors
      WHERE course_id = ANY($1)
        AND user_id = $2
    `,
    [uniqueCourseIds, userId]
  );
  return result.rows.length === uniqueCourseIds.length;
}

async function assertStudyGroupMutationAllowed(
  table: string,
  action: MutationAction,
  rows: Record<string, unknown>[],
  user: AuthenticatedUser
) {
  for (const row of rows) {
    if (hasOwnRecord(row, user, ["author_id", "created_by", "member_id", "student_id", "user_id"])) {
      continue;
    }

    const groupId = getString(row, "study_group_id", "group_id") ||
      (table === "study_groups" ? getString(row, "id") : undefined) ||
      await getGroupIdFromSession(row);
    if (groupId && await isStudyGroupOwner(user.id, groupId)) {
      continue;
    }

    if (action === "insert" && table === "study_group_members") {
      throw new AuthorizationError("Only the group owner can add other members.");
    }
    throw new AuthorizationError("Only your own study group records can be changed.");
  }
}

async function getGroupIdFromSession(row: Record<string, unknown>) {
  const sessionId = getString(row, "session_id", "study_group_session_id");
  if (!sessionId) return undefined;
  const result = await getPool().query<{ group_id: string }>(
    `SELECT group_id FROM public.study_group_sessions WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0]?.group_id;
}

async function isStudyGroupOwner(userId: string, groupId: string) {
  const result = await getPool().query(
    `
      SELECT 1
      FROM public.study_groups
      WHERE id = $1
        AND (owner_id = $2 OR created_by = $2)
      LIMIT 1
    `,
    [groupId, userId]
  );
  return result.rows.length > 0;
}

async function loadTargetRows(table: string, filters: QueryFilter[]) {
  const values: unknown[] = [];
  const where = buildWhere(table, filters, values);
  if (!where) throw new Error("Refusing to mutate without filters.");
  const result = await getPool().query(
    `SELECT * FROM public.${quoteIdent(table)}${where} LIMIT 1000`,
    values
  );
  return result.rows;
}

function isPrivileged(user: AuthenticatedUser) {
  return user.role === "admin" || user.role === "staff";
}

function isTeachingUser(user: AuthenticatedUser) {
  return user.role === "lecturer" || isPrivileged(user);
}

function assertNoProtectedProfileFields(row: Record<string, unknown>) {
  const protectedColumns = ["role", "is_active", "disabled_at", "disabled_by", "email"];
  if (protectedColumns.some(column => Object.prototype.hasOwnProperty.call(row, column))) {
    throw new AuthorizationError("Only staff can change protected profile fields.");
  }
}

function assertOwnRecord(row: Record<string, unknown>, user: AuthenticatedUser, columns: string[]) {
  if (!hasOwnRecord(row, user, columns)) {
    throw new AuthorizationError("You can only change your own records.");
  }
}

function hasOwnRecord(row: Record<string, unknown>, user: AuthenticatedUser, columns: string[]) {
  return columns.some(column => {
    const value = row[column];
    return typeof value === "string" && value === user.id;
  });
}

function getString(row: Record<string, unknown>, ...columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function buildSelectColumns(select = "*") {
  const trimmed = select.trim();
  if (!trimmed || trimmed === "*") return "*";
  if (trimmed.includes("(")) return "*";
  const columns = trimmed
    .split(",")
    .map(column => column.trim())
    .filter(Boolean)
    .map(column => {
      const aliasParts = column.split(":").map(part => part.trim());
      const actual = aliasParts[aliasParts.length - 1];
      return assertColumn(actual);
    });
  return columns.length > 0 ? columns.map(quoteIdent).join(", ") : "*";
}

async function hydrateRows(table: string, rows: Record<string, unknown>[], select: string) {
  if (rows.length === 0) return rows;
  let hydrated = rows;

  if (select.includes("course_offerings(")) {
    hydrated = await hydrateCourseOfferings(table, hydrated);
  }
  if (table === "course_offerings" && (select.includes("courses(") || select.includes("courses!"))) {
    hydrated = await hydrateCourseOfferingDetails(hydrated);
  }
  if (table === "course_offerings" && select.includes("course_instructors(")) {
    hydrated = await hydrateCourseOfferingInstructors(hydrated);
  }
  if (select.includes("user_profiles(") || select.includes("user_profiles!")) {
    hydrated = await hydrateUserProfiles(table, hydrated, select);
  }
  if (select.includes("forum_reactions(") || select.includes("forum_reply_reactions(")) {
    hydrated = await hydrateForumReactions(table, hydrated, select);
  }
  if (table === "forum_threads" && select.includes("forum_replies(count)")) {
    hydrated = await hydrateForumReplyCounts(hydrated);
  }
  if (table === "reports" && select.includes("story:stories!")) {
    hydrated = await hydrateReportStories(hydrated);
  }
  if (select.includes("study_plan_versions")) {
    hydrated = await hydrateStudyPlanVersions(hydrated);
  }

  return hydrated;
}

async function hydrateCourseOfferings(table: string, rows: Record<string, unknown>[]) {
  const offeringIds = uniqueStrings(rows.map(row => row.course_id));
  if (offeringIds.length === 0) return rows;

  const result = await getPool().query(
    `
      SELECT
        offering.*,
        row_to_json(course) AS courses,
        row_to_json(term) AS academic_terms
      FROM public.course_offerings offering
      LEFT JOIN public.courses course ON course.id = offering.course_id
      LEFT JOIN public.academic_terms term ON term.id = offering.academic_term_id
      WHERE offering.id = ANY($1)
    `,
    [offeringIds]
  );
  const byId = new Map(result.rows.map(row => [row.id, row]));
  return rows.map(row => ({
    ...row,
    course_offerings: table === "course_offerings"
      ? row
      : byId.get(row.course_id as string) || null
  }));
}

async function hydrateCourseOfferingDetails(rows: Record<string, unknown>[]) {
  const courseIds = uniqueStrings(rows.map(row => row.course_id));
  const termIds = uniqueStrings(rows.map(row => row.academic_term_id));
  const [courses, terms] = await Promise.all([
    courseIds.length > 0
      ? getPool().query(`SELECT * FROM public.courses WHERE id = ANY($1)`, [courseIds])
      : Promise.resolve({ rows: [] }),
    termIds.length > 0
      ? getPool().query(`SELECT * FROM public.academic_terms WHERE id = ANY($1)`, [termIds])
      : Promise.resolve({ rows: [] })
  ]);
  const coursesById = new Map(courses.rows.map(row => [row.id, row]));
  const termsById = new Map(terms.rows.map(row => [row.id, row]));
  return rows.map(row => ({
    ...row,
    courses: coursesById.get(row.course_id as string) || null,
    academic_terms: termsById.get(row.academic_term_id as string) || null
  }));
}

async function hydrateCourseOfferingInstructors(rows: Record<string, unknown>[]) {
  const courseOfferingIds = uniqueStrings(rows.map(row => row.id));
  if (courseOfferingIds.length === 0) return rows;

  const result = await getPool().query(
    `SELECT course_id, user_id FROM public.course_instructors WHERE course_id = ANY($1)`,
    [courseOfferingIds]
  );
  const byCourseId = groupByKey(result.rows, "course_id");
  return rows.map(row => ({
    ...row,
    course_instructors: byCourseId.get(row.id as string) || []
  }));
}

async function hydrateUserProfiles(table: string, rows: Record<string, unknown>[], select: string) {
  const targets = getUserProfileHydrationTargets(table, select);
  if (targets.length === 0) return rows;

  const userIds = uniqueStrings(
    targets.flatMap(target => rows.map(row => row[target.column]))
  );
  if (userIds.length === 0) return rows;
  const result = await getPool().query(
    `SELECT id, full_name, avatar_url, role, email, is_active FROM public.user_profiles WHERE id = ANY($1)`,
    [userIds]
  );
  const byId = new Map(result.rows.map(row => [row.id, row]));
  return rows.map(row => targets.reduce(
    (nextRow, target) => ({
      ...nextRow,
      [target.output]: byId.get(row[target.column] as string) || null
    }),
    row
  ));
}

function getUserProfileHydrationTargets(table: string, select: string) {
  const targets: Array<{ output: string; column: string }> = [];
  const add = (output: string, column: string) => {
    if (!targets.some(target => target.output === output && target.column === column)) {
      targets.push({ output, column });
    }
  };

  if (select.includes("author:user_profiles")) add("author", "author_id");
  if (select.includes("reporter:user_profiles")) add("reporter", "reporter_id");
  if (select.includes("reported_user:user_profiles")) add("reported_user", "reported_user_id");
  if (select.includes("user_profiles!follows_follower_id_fkey")) add("user_profiles", "follower_id");
  if (select.includes("user_profiles!follows_following_id_fkey")) add("user_profiles", "following_id");
  if (select.includes("user_profiles!study_group_members_user_id_fkey")) add("user_profiles", "user_id");
  if (select.includes("user_profiles!study_group_posts_author_id_fkey")) add("user_profiles", "author_id");

  const hasPlainUserProfiles = /(^|[,\s])user_profiles(?:!|\()/m.test(select) &&
    !select.includes("author:user_profiles") &&
    !select.includes("reporter:user_profiles") &&
    !select.includes("reported_user:user_profiles") &&
    targets.length === 0;

  if (hasPlainUserProfiles) {
    add("user_profiles", table === "course_instructors" ? "user_id" : "author_id");
  }

  return targets;
}

async function hydrateForumReactions(
  table: string,
  rows: Record<string, unknown>[],
  select: string
) {
  const ids = uniqueStrings(rows.map(row => row.id));
  if (ids.length === 0) return rows;

  if (table === "forum_threads" && select.includes("forum_reactions(")) {
    const result = await getPool().query(
      `SELECT thread_id, type FROM public.forum_reactions WHERE thread_id = ANY($1)`,
      [ids]
    );
    const byThread = groupByKey(result.rows, "thread_id");
    return rows.map(row => ({
      ...row,
      reactions: (byThread.get(row.id as string) || []).map(reaction => ({ type: reaction.type }))
    }));
  }

  if (table === "forum_replies" && select.includes("forum_reply_reactions(")) {
    const result = await getPool().query(
      `SELECT reply_id, type FROM public.forum_reply_reactions WHERE reply_id = ANY($1)`,
      [ids]
    );
    const byReply = groupByKey(result.rows, "reply_id");
    return rows.map(row => ({
      ...row,
      reactions: (byReply.get(row.id as string) || []).map(reaction => ({ type: reaction.type }))
    }));
  }

  return rows;
}

async function hydrateForumReplyCounts(rows: Record<string, unknown>[]) {
  const ids = uniqueStrings(rows.map(row => row.id));
  if (ids.length === 0) return rows;

  const result = await getPool().query<{ thread_id: string; count: string }>(
    `
      SELECT thread_id, count(*)::text AS count
      FROM public.forum_replies
      WHERE thread_id = ANY($1)
      GROUP BY thread_id
    `,
    [ids]
  );
  const byThread = new Map(result.rows.map(row => [row.thread_id, Number(row.count) || 0]));
  return rows.map(row => ({
    ...row,
    replies: [{ count: byThread.get(row.id as string) || 0 }]
  }));
}

async function hydrateReportStories(rows: Record<string, unknown>[]) {
  const storyIds = uniqueStrings(rows.map(row => row.story_id));
  if (storyIds.length === 0) return rows;

  const result = await getPool().query(
    `SELECT id, image_url FROM public.stories WHERE id = ANY($1)`,
    [storyIds]
  );
  const byId = new Map(result.rows.map(row => [row.id, row]));
  return rows.map(row => ({
    ...row,
    story: byId.get(row.story_id as string) || null
  }));
}

function groupByKey(rows: Record<string, unknown>[], key: string) {
  return rows.reduce<Map<string, Record<string, unknown>[]>>((groups, row) => {
    const value = row[key];
    if (typeof value !== "string") return groups;
    const current = groups.get(value) || [];
    current.push(row);
    groups.set(value, current);
    return groups;
  }, new Map());
}

async function hydrateStudyPlanVersions(rows: Record<string, unknown>[]) {
  const versionIds = uniqueStrings(rows.map(row => row.study_plan_version_id));
  if (versionIds.length === 0) return rows;
  const result = await getPool().query(
    `SELECT * FROM public.study_plan_versions WHERE id = ANY($1)`,
    [versionIds]
  );
  const byId = new Map(result.rows.map(row => [row.id, row]));
  return rows.map(row => ({
    ...row,
    study_plan_versions: byId.get(row.study_plan_version_id as string) || null
  }));
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))
  );
}

function buildWhere(table: string, filters: QueryFilter[], values: unknown[]) {
  const clauses = filters.flatMap(filter => {
    if (filter.column !== "_or") return buildFilterClauses(table, filter, values);
    if (typeof filter.value !== "string") return [];

    const orClauses = splitPostgrestOrExpression(filter.value)
      .flatMap(expression => parseOrFilterExpression(table, expression, values));
    return orClauses.length > 0 ? [`(${orClauses.join(" OR ")})`] : [];
  });

  return clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
}

function parseOrFilterExpression(table: string, expression: string, values: unknown[]) {
  const parts = expression.split(".");
  if (parts.length < 3) return [];

  const [rawColumn, rawOperator, ...rawValueParts] = parts;
  if (rawOperator === "not" && rawValueParts.length >= 2) {
    return buildFilterClauses(table, {
      column: rawColumn,
      operator: `not.${rawValueParts[0]}`,
      value: parsePostgrestFilterValue(rawValueParts[0], rawValueParts.slice(1).join("."))
    }, values);
  }

  return buildFilterClauses(table, {
    column: rawColumn,
    operator: rawOperator,
    value: parsePostgrestFilterValue(rawOperator, rawValueParts.join("."))
  }, values);
}

function buildFilterClauses(table: string, filter: QueryFilter, values: unknown[]) {
  if (filter.column.includes(".")) return buildJoinedFilterClauses(table, filter, values);

  const negated = filter.operator.startsWith("not.");
  const operator = negated ? filter.operator.slice(4) : filter.operator;
  const column = quoteIdent(assertColumn(filter.column));
  const wrap = (clause: string) => [negated ? `NOT (${clause})` : clause];

  if (operator === "eq") return wrap(`${column} = ${pushValue(values, filter.value)}`);
  if (operator === "neq") return wrap(`${column} <> ${pushValue(values, filter.value)}`);
  if (operator === "gt") return wrap(`${column} > ${pushValue(values, filter.value)}`);
  if (operator === "gte") return wrap(`${column} >= ${pushValue(values, filter.value)}`);
  if (operator === "lt") return wrap(`${column} < ${pushValue(values, filter.value)}`);
  if (operator === "lte") return wrap(`${column} <= ${pushValue(values, filter.value)}`);
  if (operator === "ilike") return wrap(`${column} ILIKE ${pushValue(values, filter.value)}`);
  if (operator === "contains") {
    return wrap(`${column} @> ${pushValue(values, JSON.stringify(filter.value))}::jsonb`);
  }
  if (operator === "is") {
    if (filter.value === null) return wrap(`${column} IS NULL`);
    if (filter.value === true) return wrap(`${column} IS TRUE`);
    if (filter.value === false) return wrap(`${column} IS FALSE`);
  }
  if (operator === "in") {
    const inValues = normalizeInValues(filter.value);
    if (inValues.length === 0) return [negated ? "TRUE" : "FALSE"];
    return wrap(`${column} = ANY(${pushValue(values, inValues)})`);
  }
  return [];
}

function buildJoinedFilterClauses(table: string, filter: QueryFilter, values: unknown[]) {
  const negated = filter.operator.startsWith("not.");
  const operator = negated ? filter.operator.slice(4) : filter.operator;
  const wrap = (clause: string) => [negated ? `NOT (${clause})` : clause];

  if (
    table === "study_plan_courses" &&
    filter.column === "study_plan_versions.status" &&
    operator === "eq"
  ) {
    return wrap(`
      EXISTS (
        SELECT 1
        FROM public.study_plan_versions spv
        WHERE spv.id = public.${quoteIdent(table)}.${quoteIdent("study_plan_version_id")}
          AND spv.status = ${pushValue(values, filter.value)}
      )
    `.replace(/\s+/g, " ").trim());
  }

  throw new Error(`Filter "${filter.column}" is not supported on Azure.`);
}

function splitPostgrestOrExpression(expression: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(expression.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(expression.slice(start).trim());
  return parts.filter(Boolean);
}

function parsePostgrestFilterValue(operator: string, rawValue: string) {
  if (operator === "is") {
    if (rawValue === "null") return null;
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
  }
  if (operator === "in") return normalizeInValues(rawValue);
  return rawValue;
}

function normalizeInValues(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  const list = trimmed.startsWith("(") && trimmed.endsWith(")")
    ? trimmed.slice(1, -1)
    : trimmed;

  if (!list.trim()) return [];
  return splitPostgrestOrExpression(list).map(item =>
    item.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")
  );
}

function buildOrder(orders: QueryOrder[]) {
  if (orders.length === 0) return "";
  const clauses = orders.map(order => {
    const direction = order.ascending === false ? "DESC" : "ASC";
    const nulls = order.nullsFirst === undefined
      ? ""
      : order.nullsFirst
        ? " NULLS FIRST"
        : " NULLS LAST";
    return `${quoteIdent(assertColumn(order.column))} ${direction}${nulls}`;
  });
  return ` ORDER BY ${clauses.join(", ")}`;
}

function buildLimit(payload: QueryPayload) {
  if (payload.range) {
    const from = Math.max(0, Number(payload.range.from) || 0);
    const to = Math.max(from, Number(payload.range.to) || from);
    return ` LIMIT ${to - from + 1} OFFSET ${from}`;
  }
  if (payload.limit !== undefined) {
    return ` LIMIT ${Math.max(0, Math.min(1000, Number(payload.limit) || 0))}`;
  }
  return "";
}

async function countRows(table: string, filters: QueryFilter[]) {
  const values: unknown[] = [];
  const where = buildWhere(table, filters, values);
  const result = await getPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.${quoteIdent(table)}${where}`,
    values
  );
  return Number(result.rows[0]?.count || 0);
}

const jsonbColumnCache = new Map<string, Set<string>>();
const primaryKeyColumnCache = new Map<string, string[]>();

async function getJsonbColumns(table: string) {
  const cached = jsonbColumnCache.get(table);
  if (cached) return cached;

  const result = await getPool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND data_type = 'jsonb'`,
    [table]
  );
  const columns = new Set(result.rows.map(row => row.column_name));
  jsonbColumnCache.set(table, columns);
  return columns;
}

async function getPrimaryKeyColumns(table: string) {
  const cached = primaryKeyColumnCache.get(table);
  if (cached) return cached;

  const result = await getPool().query<{ column_name: string }>(
    `SELECT a.attname AS column_name
     FROM pg_index i
     JOIN pg_class c ON c.oid = i.indrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
     WHERE n.nspname = 'public'
       AND c.relname = $1
       AND i.indisprimary
     ORDER BY array_position(i.indkey, a.attnum)`,
    [table]
  );
  const columns = result.rows.map(row => row.column_name);
  primaryKeyColumnCache.set(table, columns);
  return columns;
}

async function getUpsertConflictTarget(table: string, explicitConflict: unknown) {
  if (typeof explicitConflict === "string" && explicitConflict.trim()) {
    return explicitConflict;
  }

  const primaryKeyColumns = await getPrimaryKeyColumns(table);
  return primaryKeyColumns.length > 0 ? primaryKeyColumns.join(",") : "id";
}

async function insertRows(table: string, rows: Record<string, unknown>[]) {
  const columns = Object.keys(rows[0]).map(assertColumn);
  const jsonbColumns = await getJsonbColumns(table);
  const values: unknown[] = [];
  const tuples = rows.map(row =>
    `(${columns.map(column => pushColumnValue(values, column, row[column], jsonbColumns)).join(", ")})`
  );
  return getPool().query(
    `INSERT INTO public.${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
     VALUES ${tuples.join(", ")}
     RETURNING *`,
    values
  );
}

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const columns = Object.keys(rows[0]).map(assertColumn);
  const conflictColumns = onConflict.split(",").map(column => quoteIdent(assertColumn(column.trim())));
  const updateColumns = columns.filter(column => !conflictColumns.includes(quoteIdent(column)));
  const jsonbColumns = await getJsonbColumns(table);
  const values: unknown[] = [];
  const tuples = rows.map(row =>
    `(${columns.map(column => pushColumnValue(values, column, row[column], jsonbColumns)).join(", ")})`
  );
  return getPool().query(
    `INSERT INTO public.${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
     VALUES ${tuples.join(", ")}
     ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET
       ${updateColumns.map(column => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`).join(", ")}
     RETURNING *`,
    values
  );
}

async function updateRows(table: string, row: Record<string, unknown>, filters: QueryFilter[]) {
  const columns = Object.keys(row).map(assertColumn);
  const jsonbColumns = await getJsonbColumns(table);
  const values: unknown[] = [];
  const sets = columns.map(column => `${quoteIdent(column)} = ${pushColumnValue(values, column, row[column], jsonbColumns)}`);
  const where = buildWhere(table, filters, values);
  return getPool().query(
    `UPDATE public.${quoteIdent(table)} SET ${sets.join(", ")}${where} RETURNING *`,
    values
  );
}

async function deleteRows(table: string, filters: QueryFilter[]) {
  const values: unknown[] = [];
  const where = buildWhere(table, filters, values);
  if (!where) throw new Error("Refusing to delete without filters.");
  return getPool().query(
    `DELETE FROM public.${quoteIdent(table)}${where} RETURNING *`,
    values
  );
}

function normalizeData(rows: unknown[], single?: QueryPayload["single"]) {
  if (single === "single") {
    if (rows.length !== 1) throw new Error("Expected a single row.");
    return rows[0];
  }
  if (single === "maybeSingle") return rows[0] || null;
  return rows;
}

function normalizeMutationData(rows: unknown[], single?: QueryPayload["single"]) {
  return normalizeData(rows, single);
}

function normalizeRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(normalizeSingleObject)
    : [normalizeSingleObject(value)];
}

function normalizeSingleObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object payload.");
  }
  return value as Record<string, unknown>;
}

function pushValue(values: unknown[], value: unknown) {
  values.push(value);
  return `$${values.length}`;
}

function pushColumnValue(values: unknown[], column: string, value: unknown, jsonbColumns: Set<string>) {
  if (!jsonbColumns.has(column)) return pushValue(values, value);

  const parameter = pushValue(values, value === undefined ? null : JSON.stringify(value));
  return `${parameter}::jsonb`;
}

function assertAllowedTable(table: string) {
  if (!allowedTables.has(table)) throw new Error(`Table "${table}" is not enabled on Azure.`);
}

function assertColumn(column: string) {
  if (!columnPattern.test(column)) throw new Error(`Invalid column "${column}".`);
  return column;
}

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}
