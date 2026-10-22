export type SegmentedOption<Value> = { value: Value; label: string };

/** One choice among a few, as radio buttons drawn side by side. */
export function SegmentedControl<Value>({
  legend,
  name,
  options,
  value,
  onValueChange,
}: {
  /** Read by screen readers only; the options say what they are. */
  legend: string;
  /** The radio group's name, unique on the page. */
  name: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}) {
  return (
    <fieldset className="flex rounded-lg bg-component p-0.5">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.label} className="relative">
          <input
            type="radio"
            name={name}
            className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-md opacity-0"
            checked={value === option.value}
            onChange={() => onValueChange(option.value)}
          />
          {/* The input covers the label, so hover reaches it as peer-hover. */}
          <span className="flex h-8 cursor-pointer items-center rounded-md border border-transparent px-2.5 font-medium whitespace-nowrap text-fg-secondary transition-[color,background-color,border-color] duration-150 ease-out-quint select-none pointer-coarse:h-10 peer-checked:border-border-selected peer-checked:bg-page peer-checked:text-fg-primary peer-hover:text-fg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring peer-active:bg-component-hover peer-checked:peer-active:bg-page sm:px-3 dark:peer-checked:bg-component-active forced-colors:peer-checked:border-[Highlight]">
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
