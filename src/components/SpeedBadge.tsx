import { speedColorClass, speedLevel } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface Props {
  kmh: number | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClass = {
  sm: "text-sm",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-7xl",
};

export function SpeedBadge({ kmh, size = "md", className }: Props) {
  const level = speedLevel(kmh ?? 0);
  const color = speedColorClass(level);
  const v = kmh == null ? 0 : Math.round(kmh);
  return (
    <div className={cn("inline-flex items-baseline gap-1 text-speed", color, className)}>
      <span className={cn("font-bold leading-none", sizeClass[size])}>{v}</span>
      <span className="text-xs font-medium opacity-70">km/h</span>
    </div>
  );
}
