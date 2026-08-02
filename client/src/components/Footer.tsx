import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 mt-auto">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg">Komexpo Work</span>
            </div>
            <p className="text-sm text-muted-foreground">Фриланс-платформа для поиска исполнителей и заказчиков с безопасной сделкой.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Платформа</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link href="/catalog" className="block hover:text-background">Каталог услуг</Link>
              <Link href="/projects" className="block hover:text-background">Биржа проектов</Link>
              <Link href="/ads" className="block hover:text-background">Реклама</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Информация</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <span className="block">О платформе</span>
              <span className="block">Безопасная сделка</span>
              <span className="block">Правила</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Поддержка</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <span className="block">Помощь</span>
              <span className="block">Контакты</span>
              <span className="block">FAQ</span>
            </div>
          </div>
        </div>
        <div className="border-t border-muted-foreground/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Komexpo Work. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
