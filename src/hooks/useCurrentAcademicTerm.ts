import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AcademicTerm = Pick<
  Database["public"]["Tables"]["academic_terms"]["Row"],
  | "code"
  | "ends_at"
  | "name"
  | "starts_at"
  | "status"
  | "teaching_ends_at"
  | "teaching_starts_at"
>;

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const currentDateOnly = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const termStartDate = (term: AcademicTerm) =>
  parseDateOnly(term.teaching_starts_at || term.starts_at);

const termEndDate = (term: AcademicTerm) =>
  parseDateOnly(term.teaching_ends_at || term.ends_at);

const isCurrentByDate = (term: AcademicTerm, today: Date) => {
  const startsAt = termStartDate(term);
  const endsAt = termEndDate(term);
  return Boolean(startsAt && startsAt <= today && (!endsAt || endsAt >= today));
};

const compareByStartDateDesc = (left: AcademicTerm, right: AcademicTerm) =>
  (termStartDate(right)?.getTime() || 0) - (termStartDate(left)?.getTime() || 0)
  || right.code.localeCompare(left.code);

const pickCurrentAcademicTerm = (terms: AcademicTerm[]) => {
  const today = currentDateOnly();
  const realTerms = terms.filter(term => term.code !== "CURRENT");
  const dateMatchedTerm = realTerms
    .filter(term => isCurrentByDate(term, today))
    .sort(compareByStartDateDesc)[0];

  if (dateMatchedTerm) return dateMatchedTerm;

  return realTerms
    .filter(term => term.status === "active")
    .sort(compareByStartDateDesc)[0] || null;
};

export function useCurrentAcademicTerm() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTerms = async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("code, name, starts_at, ends_at, teaching_starts_at, teaching_ends_at, status")
        .order("starts_at", { ascending: false, nullsFirst: false })
        .order("code", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Error loading current academic term:", error);
        setTerms([]);
        return;
      }

      setTerms((data || []) as AcademicTerm[]);
    };

    void loadTerms();

    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(() => pickCurrentAcademicTerm(terms), [terms]);
}
