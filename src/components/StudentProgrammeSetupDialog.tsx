import { useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PROGRAMMES } from "@/lib/programmes";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

type ProgrammeOption = {
  faculty: string;
  programme: string;
};

const isMissingProgramme = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  return !normalized || normalized === "general";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export function StudentProgrammeSetupDialog() {
  const { profile, updateProfile } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProgramme, setSelectedProgramme] =
    useState<ProgrammeOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const shouldOpen =
    profile?.role === "student" &&
    (isMissingProgramme(profile.faculty) || isMissingProgramme(profile.programme));

  const programmeOptions = useMemo(
    () =>
      PROGRAMMES.map(programme => ({
        faculty: programme.level,
        programme: programme.name,
      })),
    [],
  );

  const levels = useMemo(
    () => Array.from(new Set(programmeOptions.map(option => option.faculty || "Other"))),
    [programmeOptions],
  );

  const visibleProgrammes = useMemo(() => {
    const search = programmeSearch.trim().toLowerCase();
    return programmeOptions.filter(option => {
      if (option.faculty !== selectedLevel) return false;
      if (!search) return true;
      return option.programme.toLowerCase().includes(search);
    });
  }, [programmeOptions, programmeSearch, selectedLevel]);

  const totalPages = Math.max(1, Math.ceil(visibleProgrammes.length / 5));
  const paginatedProgrammes = visibleProgrammes.slice(
    (currentPage - 1) * 5,
    currentPage * 5,
  );

  const resetProgrammeStep = () => {
    setSelectedLevel(null);
    setSelectedProgramme(null);
    setProgrammeSearch("");
    setCurrentPage(1);
    setError("");
  };

  const saveSelection = async () => {
    if (!selectedProgramme) return;
    setIsSaving(true);
    setError("");

    const { error: updateError } = await updateProfile({
      faculty: selectedProgramme.faculty,
      programme: selectedProgramme.programme,
    });

    if (updateError) {
      setError(getErrorMessage(updateError, "Failed to save programme selection."));
    } else {
      resetProgrammeStep();
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={shouldOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        hideCloseButton
        onEscapeKeyDown={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome! Select Your Programme</DialogTitle>
          <DialogDescription>
            Choose your current study programme before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!selectedLevel ? (
            <div className="space-y-2">
              <p className="mb-3 text-sm font-medium">Select Level of Study</p>
              <div className="grid grid-cols-1 gap-2">
                {levels.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className="flex w-full items-center justify-between rounded-md border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span>{level}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetProgrammeStep}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <span className="truncate text-sm font-medium">{selectedLevel}</span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programmes..."
                  className="pl-8"
                  value={programmeSearch}
                  onChange={event => {
                    setProgrammeSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="flex min-h-[280px] flex-col rounded-md border bg-muted/10 p-2">
                {visibleProgrammes.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    No programmes found.
                  </div>
                ) : (
                  <>
                    <div className="flex-1 space-y-1">
                      {paginatedProgrammes.map(option => (
                        <button
                          key={option.programme}
                          type="button"
                          onClick={() => setSelectedProgramme(option)}
                          className={`w-full rounded-md border px-3 py-3 text-left text-sm transition-colors ${
                            selectedProgramme?.programme === option.programme
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-transparent bg-card hover:bg-accent"
                          }`}
                        >
                          {option.programme}
                        </button>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-auto flex items-center justify-between border-t pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                          disabled={currentPage === 1}
                          className="h-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(page => Math.min(totalPages, page + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="h-8"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={saveSelection} disabled={!selectedProgramme || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
