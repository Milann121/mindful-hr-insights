import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  hrManagerData: any;
  onBackToVerification: () => void;
  onLoginSuccess: () => void;
}

export const LoginForm = ({ hrManagerData, onBackToVerification, onLoginSuccess }: LoginFormProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: hrManagerData.email,
    password: hrManagerData.password || ''
  });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateAccount = async () => {
    if (!formData.password || formData.password.length < 6) {
      setErrorMessage(t('auth.errors.weakPassword'));
      return;
    }

    setIsCreatingAccount(true);
    setErrorMessage('');

    try {
      // Create user account with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: hrManagerData['full name'],
            user_type: 'hr_manager'
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrorMessage(t('auth.errors.userExists'));
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      // If user was created and confirmed, sign them in and create user record
      if (data.user && data.user.email_confirmed_at) {
        // User is automatically signed in, now create user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            hr_manager_id: hrManagerData.id,
            user_type: 'hr_manager'
          });

        if (userError) {
          console.error('Error creating user record:', userError);
          // Sign them out if user record creation failed
          await supabase.auth.signOut();
          setErrorMessage('Account created but profile setup failed. Please try again.');
          return;
        }

        toast({
          title: t('auth.login.accountCreated'),
          description: t('auth.login.accountCreated'),
        });
        onLoginSuccess();
      } else {
        toast({
          title: 'Account created',
          description: 'Please check your email to confirm your account, then try signing in.',
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMessage(t('auth.errors.signupFailed'));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        setErrorMessage(t('auth.errors.invalidCredentials'));
      } else {
        onLoginSuccess();
      }
    } catch (error: any) {
      setErrorMessage(t('auth.errors.signinFailed'));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error: any) {
      setErrorMessage(t('auth.errors.signinFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBackToVerification}
        className="p-0 h-auto font-normal"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('auth.login.backToVerification')}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.login.email')}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          disabled
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.login.password')}</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button 
          onClick={handleCreateAccount}
          disabled={isCreatingAccount || isSigningIn}
          className="w-full"
          variant="default"
        >
          {isCreatingAccount ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.signup.verifying')}
            </>
          ) : (
            t('auth.login.createAccount')
          )}
        </Button>

        <Button 
          onClick={handleSignIn}
          disabled={isSigningIn || isCreatingAccount}
          className="w-full"
          variant="outline"
        >
          {isSigningIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.login.signingIn')}
            </>
          ) : (
            t('auth.login.signIn')
          )}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('auth.login.or')}
          </span>
        </div>
      </div>

      <Button 
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t('auth.login.signInWithGoogle')}
      </Button>
    </div>
  );
};