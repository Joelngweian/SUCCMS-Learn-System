import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  Loader2,
  Percent,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  cloneAssessmentValues,
  DEFAULT_COURSE_ASSESSMENT,
  type AssessmentItemType,
  type CourseAssessmentItemValue,
  type CourseAssessmentValues,
} from "@/data/courseAssessmentRepository";
import { notify } from "@/lib/notify";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";

const CATEGORY_CONFIG: Array<{
  type: AssessmentItemType;
  label: string;
  singular: string;
  icon: ReactNode;
  defaultMarks: number;
}> = [
  {
    type: "test",
    label: "Tests",
    singular: "Test",
    icon: <ClipboardCheck className="h-5 w-5 text-blue-600" />,
    defaultMarks: 20,
  },
  {
    type: "individual_assignment",
    label: "Individual Assignments",
    singular: "Individual Assignment",
    icon: <FilePenLine className="h-5 w-5 text-violet-600" />,
    defaultMarks: 100,
  },
  {
    type: "group_project",
    label: "Group Projects",
    singular: "Group Project",
    icon: <Users className="h-5 w-5 text-emerald-600" />,
    defaultMarks: 100,
  },
  {
    type: "final_exam",
    label: "Final Examination",
    singular: "Final Examination",
    icon: <GraduationCap className="h-5 w-5 text-amber-700" />,
    defaultMarks: 100,
  },
];

const createClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const formatNumber = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2);

const getTotalWeight = (values: CourseAssessmentValues) =>
  values.reduce((total, item) => total + item.weightPercentage, 0);

const isItemValid = (item: CourseAssessmentItemValue) =>
  item.title.trim().length > 0
  && item.title.trim().length <= 120
  && item.maxMarks > 0
  && item.maxMarks <= 1000
  && item.weightPercentage > 0
  && item.weightPercentage <= 100;

const getNextTitle = (
  type: AssessmentItemType,
  values: CourseAssessmentValues,
) => {
  const config = CATEGORY_CONFIG.find(category => category.type === type);
  const count = values.filter(item => item.itemType === type).length;
  if (type === "final_exam") return "Final Examination";
  return `${config?.singular || "Assessment"} ${count + 1}`;
};

interface CourseAssessmentDialogProps {
  courseName: string;
  initialValues?: CourseAssessmentValues | null;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CourseAssessmentValues) => Promise<void>;
  open: boolean;
}

export function CourseAssessmentDialog({
  courseName,
  initialValues,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: CourseAssessmentDialogProps) {
  const [values, setValues] = useState<CourseAssessmentValues>(
    cloneAssessmentValues(initialValues || DEFAULT_COURSE_ASSESSMENT),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        cloneAssessmentValues(initialValues || DEFAULT_COURSE_ASSESSMENT),
      );
    }
  }, [initialValues, open]);

  const weightTotal = useMemo(() => getTotalWeight(values), [values]);
  const totalIsValid = Math.abs(weightTotal - 100) < 0.001;
  const finalExamCount = values.filter(
    item => item.itemType === "final_exam",
  ).length;
  const formIsValid =
    values.length >= 1
    && values.length <= 50
    && finalExamCount <= 1
    && totalIsValid
    && values.every(isItemValid);

  const addItem = (type: AssessmentItemType) => {
    if (values.length >= 50) return;
    if (
      type === "final_exam"
      && values.some(item => item.itemType === "final_exam")
    ) {
      return;
    }

    const config = CATEGORY_CONFIG.find(category => category.type === type);
    setValues(current => [
      ...current,
      {
        clientId: createClientId(),
        itemType: type,
        title: getNextTitle(type, current),
        maxMarks: config?.defaultMarks || 100,
        weightPercentage: 0,
      },
    ]);
  };

  const updateItem = (
    clientId: string,
    updates: Partial<CourseAssessmentItemValue>,
  ) => {
    setValues(current =>
      current.map(item =>
        item.clientId === clientId ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeItem = (clientId: string) => {
    setValues(current => current.filter(item => item.clientId !== clientId));
  };

  const distributeEvenly = () => {
    setValues(current => {
      if (current.length === 0) return current;
      const baseWeight = Math.floor((100 / current.length) * 100) / 100;
      const lastWeight = Number(
        (100 - baseWeight * (current.length - 1)).toFixed(2),
      );
      return current.map((item, index) => ({
        ...item,
        weightPercentage:
          index === current.length - 1 ? lastWeight : baseWeight,
      }));
    });
  };

  const handleSubmit = async () => {
    if (!formIsValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      notify.error(error, "Failed to save the assessment structure.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Configure Course Assessment"
              : "Edit Assessment Structure"}
          </DialogTitle>
          <DialogDescription>
            Add every assessment separately for <strong>{courseName}</strong>.
            Each item can have different marks and a different contribution to
            the final course grade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Percent className="h-4 w-4 text-primary" />
                Total contribution
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={distributeEvenly}
                  disabled={values.length === 0}
                >
                  Distribute Evenly
                </Button>
                <Badge variant={totalIsValid ? "secondary" : "destructive"}>
                  {formatNumber(weightTotal)} / 100%
                </Badge>
              </div>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, weightTotal))}
              className={totalIsValid ? "" : "[&>div]:bg-destructive"}
            />
          </div>

          {CATEGORY_CONFIG.map(category => {
            const categoryItems = values.filter(
              item => item.itemType === category.type,
            );
            const categoryWeight = categoryItems.reduce(
              (total, item) => total + item.weightPercentage,
              0,
            );
            const canAdd =
              values.length < 50
              && (
                category.type !== "final_exam"
                || categoryItems.length === 0
              );

            return (
              <section
                key={category.type}
                className="overflow-hidden rounded-xl border"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-background p-2 shadow-sm">
                      {category.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold">{category.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {categoryItems.length} item
                        {categoryItems.length === 1 ? "" : "s"} ·{" "}
                        {formatNumber(categoryWeight)}% total
                      </p>
                    </div>
                  </div>
                  {canAdd && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addItem(category.type)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add {category.singular}
                    </Button>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  {categoryItems.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      No {category.label.toLowerCase()} added.
                    </p>
                  ) : (
                    categoryItems.map(item => (
                      <AssessmentItemRow
                        key={item.clientId}
                        item={item}
                        onChange={updates =>
                          updateItem(item.clientId, updates)
                        }
                        onRemove={() => removeItem(item.clientId)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}

          {!formIsValid && (
            <p className="text-sm text-destructive">
              Every item needs a name, positive marks and a positive
              percentage. The total contribution must equal 100%.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formIsValid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Start Teaching Course" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssessmentItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: CourseAssessmentItemValue;
  onChange: (updates: Partial<CourseAssessmentItemValue>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(180px,1fr)_140px_150px_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Assessment name
        </Label>
        <Input
          value={item.title}
          maxLength={120}
          onChange={event => onChange({ title: event.target.value })}
          placeholder="e.g. Test 1"
        />
      </div>
      <NumberField
        label="Maximum marks"
        value={item.maxMarks}
        onChange={maxMarks => onChange({ maxMarks })}
        max={1000}
      />
      <NumberField
        label="Final grade %"
        value={item.weightPercentage}
        onChange={weightPercentage => onChange({ weightPercentage })}
        max={100}
        suffix="%"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onRemove}
        title={`Remove ${item.title || "assessment"}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function NumberField({
  label,
  max,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          max={max}
          step="0.01"
          value={value}
          onChange={event => {
            const nextValue =
              event.target.value === "" ? 0 : Number(event.target.value);
            if (Number.isFinite(nextValue)) onChange(nextValue);
          }}
          className={suffix ? "pr-8" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function CourseAssessmentSummary({
  structure,
}: {
  structure?: CourseAssessmentValues | null;
}) {
  if (!structure?.length) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Assessment structure is being prepared by the lecturer.
      </div>
    );
  }

  const groups = CATEGORY_CONFIG.flatMap(category => {
    const items = structure.filter(item => item.itemType === category.type);
    if (items.length === 0) return [];
    return [{
      label: category.label,
      weight: items.reduce(
        (total, item) => total + item.weightPercentage,
        0,
      ),
      items,
    }];
  });

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" />
        Assessment Structure
      </div>
      <div className="space-y-3">
        {groups.map(group => (
          <section key={group.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <strong className="text-xs font-semibold">{group.label}</strong>
              <Badge
                variant="secondary"
                className="h-5 min-w-11 justify-center px-1.5 text-[10px] tabular-nums"
              >
                {formatNumber(group.weight)}%
              </Badge>
            </div>
            <div className="divide-y overflow-hidden rounded-md border bg-background/70">
              {group.items.map(item => (
                <div
                  key={item.clientId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1.5 text-xs"
                >
                  <span
                    className="truncate text-foreground"
                    title={item.title}
                  >
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-muted-foreground tabular-nums">
                      {formatNumber(item.maxMarks)} marks
                    </span>
                    <span className="min-w-10 rounded bg-primary/10 px-1.5 py-0.5 text-center font-medium text-primary tabular-nums">
                      {formatNumber(item.weightPercentage)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
