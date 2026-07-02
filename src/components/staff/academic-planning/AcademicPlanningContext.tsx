import { createContext, type ReactNode, useContext } from "react";

export type StaffAcademicPlanningContextValue = Record<string, any>;

const StaffAcademicPlanningContext = createContext<StaffAcademicPlanningContextValue | null>(null);

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

export function useStaffAcademicPlanningContext() {
  const value = useContext(StaffAcademicPlanningContext);
  if (!value) {
    throw new Error("useStaffAcademicPlanningContext must be used inside StaffAcademicPlanningProvider");
  }
  return value;
}
