import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompleteSignupFormProps {
  onSignupSuccess: () => void;
  onBackToLogin: () => void;
}

export const CompleteSignupForm = ({ onSignupSuccess, onBackToLogin }: CompleteSignupFormProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    b2bPartner: '',
    password: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showResend, setShowResend] = useState(false);

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: t('auth.login.resendError'),
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('auth.login.resendSuccess')
        });
      }
    } catch (e) {
      toast({
        title: t('auth.login.resendError'),
        variant: 'destructive'
      });
    }
  };

  const handleCompleteSignup = async () => {
    setShowResend(false);
    if (!formData.fullName || !formData.email || !formData.b2bPartner || !formData.password) {
      setErrorMessage(t('auth.signup.fillAllFields'));
      setVerificationStatus('error');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage(t('auth.errors.weakPassword'));
      setVerificationStatus('error');
      return;
    }

    setIsProcessing(true);
    setVerificationStatus('idle');
    setErrorMessage('');

    try {
      // First verify HR manager exists
      const { data: hrManager, error: verifyError } = await supabase
        .from('hr_managers')
        .select('*')
        .eq('email', formData.email)
        .eq('full name', formData.fullName)
        .eq('b2b_partner', parseInt(formData.b2bPartner))
        .single();

      if (verifyError || !hrManager) {
        setVerificationStatus('error');
        setErrorMessage(t('auth.signup.notVerified'));
        return;
      }

      // Create user account with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: formData.fullName,
            user_type: 'hr_manager'
          }
        }
      });

      if (signUpError) {
        setVerificationStatus('error');
        if (signUpError.message.includes('already registered')) {
          setErrorMessage('Account already exists. Please check your email for a confirmation link or try signing in. If you need a new confirmation email, click the resend button below.');
          setShowResend(true);
        } else {
          setErrorMessage(signUpError.message);
        }
        return;
      }

      // If user was created and confirmed, create user record
      if (authData.user && authData.user.email_confirmed_at) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            hr_manager_id: hrManager.id,
            user_type: 'hr_manager'
          });

        if (userError) {
          console.error('Error creating user record:', userError);
          await supabase.auth.signOut();
          setErrorMessage('Account created but profile setup failed. Please try again.');
          setVerificationStatus('error');
          return;
        }

        toast({
          title: t('auth.login.accountCreated'),
          description: 'You are now signed in!',
        });
        onSignupSuccess();
      } else {
        // Account created but needs email confirmation
        setShowResend(true);
        setVerificationStatus('success');
        toast({
          title: 'Account created',
          description: 'Please check your email to confirm your account, then you can sign in.',
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setVerificationStatus('error');
      setErrorMessage(t('auth.errors.verificationFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBackToLogin}
        className="p-0 h-auto font-normal"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('auth.login.backToLogin')}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="fullName">{t('auth.signup.fullName')}</Label>
        <Input
          id="fullName"
          type="text"
          placeholder={t('auth.signup.fullNamePlaceholder')}
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.signup.email')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('auth.signup.emailPlaceholder')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="b2bPartner">{t('auth.signup.b2bPartner')}</Label>
        <Input
          id="b2bPartner"
          type="number"
          placeholder={t('auth.signup.b2bPartnerPlaceholder')}
          value={formData.b2bPartner}
          onChange={(e) => setFormData({ ...formData, b2bPartner: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.signup.password')}</Label>
        <Input
          id="password"
          type="password"
          placeholder={t('auth.signup.passwordPlaceholder')}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      {verificationStatus === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {verificationStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('auth.signup.verified')} Please check your email to confirm your account.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleCompleteSignup}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth.signup.verifying')}
          </>
        ) : (
          t('auth.signup.createAccount')
        )}
      </Button>

      {showResend && (
        <Button onClick={handleResendEmail} variant="link" className="w-full">
          {t('auth.login.resend')}
        </Button>
      )}
    </div>
  );
};