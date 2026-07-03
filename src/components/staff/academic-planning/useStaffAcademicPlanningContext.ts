import { useContext } from "react";
import { StaffAcademicPlanningContext } from "./AcademicPlanningContext";

export function useStaffAcademicPlanningContext() {
  const value = useContext(StaffAcademicPlanningContext);
  if (!value) {
    throw new Error("useStaffAcademicPlanningContext must be used inside StaffAcademicPlanningProvider");
  }
  return value;
}
