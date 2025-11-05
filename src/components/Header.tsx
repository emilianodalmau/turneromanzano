import Link from "next/link";
import Logo from "./Logo";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between h-16">
        <Logo />
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/admin">Panel de Admin</Link>
          </Button>
          <Button asChild>
            <Link href="/book">Reservar Turno</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
