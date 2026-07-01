"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  Shuffle,
  GripVertical,
  X,
  Loader2,
  Leaf,
  Drumstick,
  CalendarRange,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MealDetailDialog } from "@/components/planner/meal-detail-dialog";
import { ShoppingListDialog } from "@/components/planner/shopping-list-dialog";
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from "@/lib/constants";
import { DAY_NAMES, formatWeekRange, dateForDay, shiftWeek, getWeekStart } from "@/lib/week";
import type { MealPlanView, MealView, SlotView } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  generatePlan,
  regenerateOneSlot,
  moveSlot,
  toggleSlotLock,
  clearSlot,
} from "@/app/(app)/planner/actions";

interface SlotPos {
  day: number;
  mealType: MealType;
}

export function PlannerClient({
  meals,
  initialPlan,
  weekStart,
  workspaceLabel,
  householdSize,
}: {
  meals: MealView[];
  initialPlan: MealPlanView | null;
  weekStart: string;
  workspaceLabel: string;
  householdSize: number;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlanView | null>(initialPlan);
  const [vegPercent, setVegPercent] = useState(initialPlan?.vegPercent ?? 50);
  const [pending, startTransition] = useTransition();
  const [viewMeal, setViewMeal] = useState<MealView | null>(null);
  const [dragSource, setDragSource] = useState<SlotPos | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const mealById = useMemo(
    () => new Map(meals.map((m) => [m.id, m])),
    [meals]
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, SlotView>();
    plan?.slots.forEach((s) => map.set(`${s.day}:${s.mealType}`, s));
    return map;
  }, [plan]);

  const stats = useMemo(() => {
    let veg = 0;
    let nonveg = 0;
    let empty = 0;
    plan?.slots.forEach((s) => {
      const m = s.mealId ? mealById.get(s.mealId) : null;
      if (!m) empty++;
      else if (m.diet === "veg") veg++;
      else nonveg++;
    });
    return { veg, nonveg, empty };
  }, [plan, mealById]);

  const plannedMeals = useMemo(() => {
    const arr: MealView[] = [];
    plan?.slots.forEach((s) => {
      const m = s.mealId ? mealById.get(s.mealId) : null;
      if (m) arr.push(m);
    });
    return arr;
  }, [plan, mealById]);

  function goWeek(offset: number) {
    router.push(`/planner?week=${shiftWeek(weekStart, offset)}`);
  }

  function handleGenerate() {
    startTransition(async () => {
      const res = await generatePlan(weekStart, vegPercent);
      if (res.ok && res.plan) {
        setPlan(res.plan);
        toast.success(plan ? "Week regenerated" : "Week generated");
      } else {
        toast.error(res.error ?? "Failed to generate");
      }
    });
  }

  function runSlotAction(promise: Promise<{ ok: boolean; error?: string; plan?: MealPlanView }>) {
    startTransition(async () => {
      const res = await promise;
      if (res.ok && res.plan) setPlan(res.plan);
      else toast.error(res.error ?? "Failed");
    });
  }

  function handleDrop(target: SlotPos) {
    const source = dragSource;
    setDragSource(null);
    setDragOver(null);
    if (!source) return;
    if (source.day === target.day && source.mealType === target.mealType) return;
    const targetSlot = slotMap.get(`${target.day}:${target.mealType}`);
    if (targetSlot?.locked) {
      toast.error("That slot is locked.");
      return;
    }
    runSlotAction(moveSlot(weekStart, source, target));
  }

  const hasMeals = meals.length > 0;
  const isThisWeek = weekStart === getWeekStart();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Weekly planner</h1>
          <p className="text-sm text-muted-foreground">{workspaceLabel}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button variant="ghost" size="icon" onClick={() => goWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {formatWeekRange(weekStart)}
            {isThisWeek && (
              <Badge variant="secondary" className="ml-1">
                This week
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => goWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-1.5 text-green-600">
                <Leaf className="h-4 w-4" /> Veg {vegPercent}%
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                Non-veg {100 - vegPercent}% <Drumstick className="h-4 w-4" />
              </span>
            </div>
            <Slider
              value={[vegPercent]}
              onValueChange={(v) =>
                setVegPercent(Array.isArray(v) ? v[0] : v)
              }
              min={0}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Target mix across the week. Locked meals are always kept.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {plan && (
              <div className="hidden items-center gap-2 sm:flex">
                <Badge className="gap-1 bg-green-600 text-white">
                  <Leaf className="h-3 w-3" /> {stats.veg}
                </Badge>
                <Badge className="gap-1 bg-rose-600 text-white">
                  <Drumstick className="h-3 w-3" /> {stats.nonveg}
                </Badge>
                {stats.empty > 0 && (
                  <Badge variant="outline">{stats.empty} empty</Badge>
                )}
              </div>
            )}
            {plan && plannedMeals.length > 0 && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShoppingOpen(true)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Shopping list
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={pending || !hasMeals}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {plan ? "Regenerate week" : "Generate week"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasMeals ? (
        <EmptyMeals />
      ) : !plan ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No plan for this week yet</p>
          <p className="text-sm text-muted-foreground">
            Set your veg / non-veg mix and generate a varied week.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
            Drag a meal onto another slot to move or swap it. Lock a slot to keep
            it.
          </p>
          {DAY_NAMES.map((dayName, dayIdx) => (
            <Card key={dayName} className="overflow-hidden p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="flex shrink-0 items-center justify-between gap-1 border-b bg-muted/40 px-4 py-3 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r">
                  <p className="font-semibold">{dayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {dateForDay(weekStart, dayIdx)}
                  </p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-2 p-3 sm:grid-cols-3">
                  {MEAL_TYPES.map((type) => {
                    const key = `${dayIdx}:${type}`;
                    const slot = slotMap.get(key);
                    const meal = slot?.mealId
                      ? mealById.get(slot.mealId)
                      : null;
                    return (
                      <SlotCell
                        key={type}
                        mealType={type}
                        meal={meal ?? null}
                        locked={!!slot?.locked}
                        disabled={pending}
                        isDragging={
                          dragSource?.day === dayIdx &&
                          dragSource?.mealType === type
                        }
                        isDropTarget={dragOver === key && dragSource !== null}
                        onLock={() =>
                          runSlotAction(toggleSlotLock(weekStart, dayIdx, type))
                        }
                        onShuffle={() =>
                          runSlotAction(
                            regenerateOneSlot(weekStart, dayIdx, type)
                          )
                        }
                        onClear={() =>
                          runSlotAction(clearSlot(weekStart, dayIdx, type))
                        }
                        onView={() => meal && setViewMeal(meal)}
                        onDragStart={() =>
                          setDragSource({ day: dayIdx, mealType: type })
                        }
                        onDragEnd={() => {
                          setDragSource(null);
                          setDragOver(null);
                        }}
                        onDragEnterSlot={() => setDragOver(key)}
                        onDropSlot={() =>
                          handleDrop({ day: dayIdx, mealType: type })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MealDetailDialog
        meal={viewMeal}
        open={viewMeal !== null}
        onOpenChange={(o) => !o && setViewMeal(null)}
      />

      <ShoppingListDialog
        open={shoppingOpen}
        onOpenChange={setShoppingOpen}
        plannedMeals={plannedMeals}
        householdSize={householdSize}
      />
    </div>
  );
}

function SlotCell({
  mealType,
  meal,
  locked,
  disabled,
  isDragging,
  isDropTarget,
  onLock,
  onShuffle,
  onClear,
  onView,
  onDragStart,
  onDragEnd,
  onDragEnterSlot,
  onDropSlot,
}: {
  mealType: MealType;
  meal: MealView | null;
  locked: boolean;
  disabled: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onLock: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onView: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragEnterSlot: () => void;
  onDropSlot: () => void;
}) {
  const draggable = !!meal && !locked && !disabled;

  return (
    <div
      onDragOver={(e) => {
        if (!locked) e.preventDefault();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnterSlot();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropSlot();
      }}
      className={cn(
        "group rounded-md border p-2 transition-colors",
        locked && "border-primary/50 bg-primary/5",
        !meal && "border-dashed",
        isDragging && "opacity-40",
        isDropTarget && !locked && "border-primary ring-2 ring-primary/40",
        isDropTarget && locked && "border-destructive/50"
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {MEAL_TYPE_LABELS[mealType]}
        </span>
        <button
          type="button"
          onClick={onLock}
          disabled={disabled}
          className={cn(
            "rounded p-0.5 text-muted-foreground hover:text-foreground",
            locked && "text-primary"
          )}
          title={locked ? "Unlock" : "Lock"}
        >
          {locked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Unlock className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
          )}
        </button>
      </div>

      {meal ? (
        <div
          draggable={draggable}
          onDragStart={(e) => {
            if (!draggable) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", meal.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className={cn(
            "flex items-start gap-2 rounded",
            draggable && "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="relative shrink-0">
            {meal.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meal.imageUrl}
                alt=""
                className="h-11 w-11 rounded object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded bg-muted text-sm">
                🍽
              </span>
            )}
            {draggable && (
              <GripVertical className="absolute -left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
          <button
            type="button"
            onClick={onView}
            title="View recipe & ingredients"
            className="min-w-0 flex-1 text-left hover:opacity-80"
          >
            <p className="truncate text-sm font-medium leading-tight">
              {meal.name}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-block h-2 w-2 rounded-full",
                meal.diet === "veg" ? "bg-green-600" : "bg-rose-600"
              )}
              title={meal.diet === "veg" ? "Veg" : "Non-veg"}
            />
          </button>
        </div>
      ) : (
        <p className="py-1 text-xs text-muted-foreground">
          No meal — drop one here
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <IconBtn title="Shuffle" onClick={onShuffle} disabled={disabled || locked}>
          <Shuffle className="h-3.5 w-3.5" />
        </IconBtn>
        {meal && (
          <IconBtn title="Clear" onClick={onClear} disabled={disabled}>
            <X className="h-3.5 w-3.5" />
          </IconBtn>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyMeals() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
      <CalendarRange className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="font-medium">Your library is empty</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Add meals to your library before generating a plan.
      </p>
      <Button render={<a href="/library" />}>Go to library</Button>
    </div>
  );
}
