import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  parseAcademicPlanningTab,
  type AcademicPlanningTab,
} from "./academicPlanningTabs";

export const useAcademicPlanningTabState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePlanningTab, setActivePlanningTab] =
    useState<AcademicPlanningTab>(
      parseAcademicPlanningTab(searchParams.get("tab")),
    );

  useEffect(() => {
    const nextTab = parseAcademicPlanningTab(searchParams.get("tab"));
    setActivePlanningTab(current => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  const handlePlanningTabChange = (value: string) => {
    const nextTab = parseAcademicPlanningTab(value);
    setActivePlanningTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  return {
    activePlanningTab,
    handlePlanningTabChange,
  };
};
