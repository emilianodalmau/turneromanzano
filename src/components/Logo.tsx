import { Apple } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  isLink?: boolean;
};

export default function Logo({ className, isLink = true }: LogoProps) {
  const content = (
    <>
      <Apple className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold text-primary font-headline">
        Turnos Manzano
      </span>
    </>
  );

  if (isLink) {
    return (
      <Link href="/" className={cn("flex items-center gap-2", className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn("flex items-center gap-2", className)}>{content}</div>;
}
