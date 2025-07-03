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
    b2bPartner: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async () => {
    if (!formData.fullName || !formData.email || !formData.b2bPartner) {
      setErrorMessage(t('auth.signup.fillAllFields'));
      setVerificationStatus('error');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    try {
      const { data, error } = await supabase
        .from('hr_managers')
        .select('*')
        .eq('email', formData.email)
        .eq('full name', formData.fullName)
        .eq('b2b_partner', parseInt(formData.b2bPartner))
        .single();

      if (error || !data) {
        setVerificationStatus('error');
        setErrorMessage(t('auth.signup.notVerified'));
      } else {
        setVerificationStatus('success');
        onVerified(data);
      }
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