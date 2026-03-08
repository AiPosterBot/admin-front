interface UserAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
}

export function UserAvatar({
  name,
  size = "md",
  color = "bg-blue-600",
}: UserAvatarProps) {
  const sizeClasses = {
    xs: "size-5 text-xs",
    sm: "size-6 text-xs",
    md: "size-8 text-sm",
    lg: "size-12 text-base",
    xl: "size-16 text-xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${color} text-white flex items-center justify-center rounded-full font-medium pointer-events-none flex-shrink-0`}
    >
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
}
