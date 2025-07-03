import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleLoginForm } from "@/components/auth/SimpleLoginForm";
import { CompleteSignupForm } from "@/components/auth/CompleteSignupForm";
import { LanguageSwitcher } from "@/components/auth/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        navigate('/');
      }
    };

    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        navigate('/');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSwitchToSignup = () => {
    setCurrentStep('signup');
  };

  const handleBackToLogin = () => {
    setCurrentStep('login');
  };

  const handleLoginSuccess = () => {
    navigate('/');
  };

  const handleSignupSuccess = () => {
    navigate('/');
  };

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-2xl text-primary">
                {t('auth.title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('auth.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === 'login' && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">{t('auth.login.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
                </div>
                <SimpleLoginForm 
                  onLoginSuccess={handleLoginSuccess}
                  onSwitchToSignup={handleSwitchToSignup}
                />
              </div>
            )}
            
            {currentStep === 'signup' && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">{t('auth.signup.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('auth.signup.subtitle')}</p>
                </div>
                <CompleteSignupForm 
                  onSignupSuccess={handleSignupSuccess}
                  onBackToLogin={handleBackToLogin}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}