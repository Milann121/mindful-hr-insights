import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Settings, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Navigation = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { path: '/', label: t('navigation.dashboard'), icon: Home },
    { path: '/action-room', label: t('navigation.actionRoom'), icon: Settings },
    { path: '/profile', label: t('navigation.profile'), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  const NavigationLinks = ({ mobile = false }) => (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={mobile ? () => setIsOpen(false) : undefined}
            className={`flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary ${
              isActive(item.path) 
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-gray-600'
            } ${mobile ? 'p-4 w-full justify-start' : ''}`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <NavigationLinks />
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="flex flex-col space-y-4 mt-8">
              <NavigationLinks mobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Navigation;