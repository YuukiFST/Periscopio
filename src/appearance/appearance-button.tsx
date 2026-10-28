import { Popover } from "@base-ui/react/popover";
import { SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { useTableDensity, useTheme, type TableDensity, type Theme } from "./appearance";

const themeOptions: SegmentedOption<Theme>[] = [
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
  { value: "sistema", label: "Sistema" },
];

const tableDensityOptions: SegmentedOption<TableDensity>[] = [
  { value: "confortavel", label: "Confortável" },
  { value: "compacta", label: "Compacta" },
];

/** The header's "Aparência" button: the theme and the table density, kept on this device. */
export function AppearanceButton() {
  const [theme, setTheme] = useTheme();
  const [tableDensity, setTableDensity] = useTableDensity();
  return (
    <Popover.Root>
      <Popover.Trigger render={<Button variant="tertiary" size="icon-lg" aria-label="Aparência" />}>
        <SunMoon aria-hidden="true" strokeWidth={1.5} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup className="flex w-max max-w-[calc(100vw-1rem)] flex-col gap-4 rounded-2xl border border-transparent bg-popover p-4 text-body text-popover-foreground shadow-surface-5 transition-[opacity,scale] duration-150 ease-out-quint outline-none origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="font-medium">Aparência</Popover.Title>
            <div className="flex flex-col gap-1.5">
              <p aria-hidden="true" className="text-caption text-muted-foreground">
                Tema
              </p>
              <SegmentedControl
                legend="Tema"
                name="tema"
                options={themeOptions}
                value={theme}
                onValueChange={setTheme}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p aria-hidden="true" className="text-caption text-muted-foreground">
                Densidade da tabela
              </p>
              <SegmentedControl
                legend="Densidade da tabela"
                name="densidade-da-tabela"
                options={tableDensityOptions}
                value={tableDensity}
                onValueChange={setTableDensity}
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
