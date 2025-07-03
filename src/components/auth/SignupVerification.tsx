import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SignupVerificationProps {
  onVerified: (hrManagerData: any) => void;
}

export const SignupVerification = ({ onVerified }: SignupVerificationProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    b2bPartner: '',
    password: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async () => {
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

    setIsVerifying(true);
    setVerificationStatus('idle');

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
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            user_type: 'hr_manager'
          }
        }
      });

      if (signUpError) {
        setVerificationStatus('error');
        if (signUpError.message.includes('already registered')) {
          setErrorMessage(t('auth.errors.userExists'));
        } else {
          setErrorMessage(signUpError.message);
        }
        return;
      }

      if (authData.user) {
        // Create user record linking to hr_manager
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            hr_manager_id: hrManager.id,
            user_type: 'hr_manager'
          });

        if (userError) {
          console.error('Error creating user record:', userError);
        }
      }

      setVerificationStatus('success');
      onVerified({ ...hrManager, user: authData.user });
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage(t('auth.errors.verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
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
          <AlertDescription>{t('auth.signup.verified')}</AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={handleVerify} 
        disabled={isVerifying || verificationStatus === 'success'}
        className="w-full"
      >
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth.signup.verifying')}
          </>
        ) : (
          t('auth.signup.verify')
        )}
      </Button>
    </div>
  );
};