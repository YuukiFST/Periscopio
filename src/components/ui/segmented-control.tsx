import { motion } from "motion/react";
import { spring } from "@/lib/springs";
import { surfaceClasses } from "@/lib/surface-classes";

export type SegmentedOption<Value> = { value: Value; label: string };

/** One choice among a few, as radio buttons drawn as Fluid Functionalism's segmented control. */
export function SegmentedControl<Value>({
  legend,
  name,
  options,
  value,
  onValueChange,
}: {
  /** Read by screen readers only; the options say what they are. */
  legend: string;
  /** The radio group's name, unique on the page; it also keys the sliding pill. */
  name: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}) {
  return (
    <fieldset className="flex rounded-xl bg-muted p-1">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const isChecked = value === option.value;
        return (
          <label key={option.label} className="relative">
            <input
              type="radio"
              name={name}
              className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-lg opacity-0"
              checked={isChecked}
              onChange={() => onValueChange(option.value)}
            />
            {isChecked && (
              <motion.span
                aria-hidden="true"
                layoutId={`${name}-selected`}
                transition={spring.moderate}
                className={`absolute inset-0 rounded-lg ${surfaceClasses(4)} forced-colors:border forced-colors:border-[Highlight]`}
              />
            )}
            {/* The input covers the label, so hover reaches it as peer-hover. */}
            <span className="relative flex h-7 cursor-pointer items-center rounded-lg px-2.5 font-medium whitespace-nowrap text-muted-foreground transition-colors duration-80 select-none pointer-coarse:h-9 peer-checked:text-foreground peer-hover:text-foreground peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring sm:px-3">
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
