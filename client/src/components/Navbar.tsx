import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { startLogin } from "@/const";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogOut, LayoutDashboard, Shield, Crown, Megaphone, MessageSquare, Bell, Wallet } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { href: "/catalog", label: "Каталог услуг" },
    { href: "/projects", label: "Биржа проектов" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-lg text-foreground">Komexpo Work</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-primary ${location === link.href ? 'text-primary' : 'text-muted-foreground'}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/chat">
                <Button variant="ghost" size="icon"><MessageSquare className="w-5 h-5" /></Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user?.name || 'Профиль'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/customer" className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> Кабинет заказчика
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/contractor" className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> Кабинет подрядчика
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/ads" className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4" /> Рекламный кабинет
                    </Link>
                  </DropdownMenuItem>
                  {(user?.role === 'admin' || user?.role === 'owner') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="w-4 h-4" /> Админ-панель
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'owner' && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner" className="flex items-center gap-2">
                        <Crown className="w-4 h-4" /> Дашборд владельца
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/payments" className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Платежи и финансы
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/setup" className="flex items-center gap-2">
                      <User className="w-4 h-4" /> Настройки профиля
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()} className="flex items-center gap-2 text-destructive">
                    <LogOut className="w-4 h-4" /> Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => startLogin()}>Войти</Button>
              <Button onClick={() => startLogin()}>Регистрация</Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-white p-4 space-y-3">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link href="/dashboard/customer" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Кабинет заказчика</Link>
              <Link href="/dashboard/contractor" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Кабинет подрядчика</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2 text-sm text-destructive">Выйти</button>
            </>
          ) : (
            <Button className="w-full" onClick={() => startLogin()}>Войти / Регистрация</Button>
          )}
        </div>
      )}
    </header>
  );
}
