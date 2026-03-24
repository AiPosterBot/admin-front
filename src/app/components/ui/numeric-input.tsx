import * as React from "react";

import { cn } from "./utils";

type NumericParseMode = "int" | "float";

export interface NumericInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "inputMode"> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fallbackValue?: number;
  parseMode?: NumericParseMode;
}

function parseDraftValue(draft: string, parseMode: NumericParseMode) {
  const normalized = draft.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = parseMode === "float" ? Number.parseFloat(normalized) : Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericValue(value: number, parseMode: NumericParseMode) {
  return parseMode === "int" ? String(Math.trunc(value)) : String(value);
}

function clampNumericValue(value: number, min?: number, max?: number) {
  let nextValue = value;

  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }

  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}

function alignToStep(value: number, step?: number, min?: number) {
  if (!step || step <= 0) {
    return value;
  }

  const base = min ?? 0;
  const steps = Math.round((value - base) / step);
  return base + steps * step;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  {
    className,
    value,
    onValueChange,
    min,
    max,
    step,
    fallbackValue,
    parseMode = "int",
    onBlur,
    onFocus,
    onKeyDown,
    ...props
  },
  ref,
) {
  const [draftValue, setDraftValue] = React.useState(() => formatNumericValue(value, parseMode));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setDraftValue(formatNumericValue(value, parseMode));
    }
  }, [isFocused, parseMode, value]);

  const commitDraft = React.useCallback(() => {
    const parsed = parseDraftValue(draftValue, parseMode);
    const resolvedValue = parsed ?? fallbackValue ?? value;
    const steppedValue = alignToStep(resolvedValue, step, min);
    const nextValue = clampNumericValue(steppedValue, min, max);

    onValueChange(nextValue);
    setDraftValue(formatNumericValue(nextValue, parseMode));
  }, [draftValue, fallbackValue, max, min, onValueChange, parseMode, step, value]);

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode={parseMode === "float" ? "decimal" : "numeric"}
      value={draftValue}
      onChange={(event) => {
        const nextDraft = event.target.value;
        const allowedPattern = parseMode === "float" ? /^-?\d*([.,]\d*)?$/ : /^-?\d*$/;
        if (!allowedPattern.test(nextDraft)) {
          return;
        }

        setDraftValue(nextDraft);
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        commitDraft();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }

        onKeyDown?.(event);
      }}
      data-slot="numeric-input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-input-background px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
    />
  );
});
