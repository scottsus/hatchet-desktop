import { cn } from "../lib/utils";

export function FireFighterCircle({
  initials,
  color,
  size = "sm",
  style,
}: {
  initials: string;
  color: string;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}) {
  const isDefaultSize = size === "md";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full p-1",
        isDefaultSize ? "p-1" : "p-[0.2rem]",
      )}
      style={{ backgroundColor: color, ...style }}
    >
      <div
        className={cn(
          "z-10 flex items-center justify-center rounded-full bg-black/40",
          isDefaultSize ? "p-1" : "p-0.2",
        )}
      >
        <p
          className={cn(
            "rounded-full text-white",
            isDefaultSize ? "text-base" : "text-[9px]",
            isDefaultSize ? "font-medium" : "font-light",
            isDefaultSize ? "mx-[0.125rem]" : "mx-[0.30rem]",
          )}
        >
          {initials}
        </p>
      </div>
    </div>
  );
}
