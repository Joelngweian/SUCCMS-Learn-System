import type { ReactNode } from "react";
import {
  StaffAcademicPlanningContext,
  type StaffAcademicPlanningContextValue,
} from "./AcademicPlanningContext";

export function StaffAcademicPlanningProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: StaffAcademicPlanningContextValue;
}) {
  return (
    <StaffAcademicPlanningContext.Provider value={value}>
      {children}
    </StaffAcademicPlanningContext.Provider>
  );
}
