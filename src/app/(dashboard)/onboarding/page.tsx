'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Step1Business, type BusinessFormData, type BrandFormData } from '@/components/onboarding/step1-business';
import { Step2Meta } from '@/components/onboarding/step2-meta';
import { Step3Goals, type GoalsFormData } from '@/components/onboarding/step3-goals';
import { Step4Personas } from '@/components/onboarding/step4-personas';
import { Step4Summary } from '@/components/onboarding/step4-summary';
import { cn } from '@/lib/utils';
import { Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { BuyerPersona, SalesAngle } from '@/types';

const stepLabels = ['Negocio', 'Meta', 'Objetivos', 'Audiencia', 'Confirmar'];

function OnboardingContent() {
  const { user, profile, metaConnection, refresh } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [businessData, setBusinessData] = useState<BusinessFormData | null>(null);
  const [metaSelections, setMetaSelections] = useState<{
    ad_account_id: string;
    ad_account_name: string;
    page_id: string;
    page_name: string;
    pixel_id: string;
    pixel_name: string;
  } | null>(null);
  const [goalsData, setGoalsData] = useState<GoalsFormData | null>(null);
  const [personasData, setPersonasData] = useState<{ buyer_personas: BuyerPersona[]; sales_angles: SalesAngle[] } | null>(null);
  const [brandFormData, setBrandFormData] = useState<BrandFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const metaError = searchParams.get('meta_error');
  const metaConnected = searchParams.get('meta_connected');

  // Resume at correct step and reload saved data from DB
  useEffect(() => {
    if (profile?.onboarding_step && profile.onboarding_step > 0) {
      setCurrentStep(Math.min(profile.onboarding_step, 4));
    }

    // Reload business + goals data from DB so step 4 renders on page refresh
    if (user && !businessData) {
      supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setBusinessData({
              business_name: data.business_name || '',
              industry: data.industry || '',
              description: data.description || '',
              location: data.location || '',
              website: data.website || '',
              whatsapp: data.whatsapp || '',
            });
            if (data.objectives?.length) {
              setGoalsData({
                objectives: data.objectives,
                monthly_budget: data.monthly_budget || '',
                experience_level: data.experience_level || 'principiante',
                brand_tone: data.brand_tone || 'profesional',
              });
            }
            if (data.buyer_personas?.length || data.sales_angles?.length) {
              setPersonasData({
                buyer_personas: data.buyer_personas || [],
                sales_angles: data.sales_angles || [],
              });
            }
            if (data.logo_url || data.brand_colors || data.brand_typography) {
              setBrandFormData({
                logo_url: data.logo_url || null,
                brand_colors: data.brand_colors || null,
                brand_typography: data.brand_typography || null,
              });
            }
          }
        });
    }

    if (metaConnection && !metaSelections) {
      setMetaSelections({
        ad_account_id: metaConnection.ad_account_id || '',
        ad_account_name: metaConnection.ad_account_name || '',
        page_id: metaConnection.page_id || '',
        page_name: metaConnection.page_name || '',
        pixel_id: metaConnection.pixel_id || '',
        pixel_name: metaConnection.pixel_name || '',
      });
    }
  }, [profile?.onboarding_step, user, metaConnection]);

  // If returning from Meta OAuth, land on step 2
  useEffect(() => {
    if (metaError || metaConnected) {
      setCurrentStep(1);
      if (metaConnected) refresh();
    }
  }, [metaError, metaConnected]);

  const saveStep = async (step: number) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_step: step })
      .eq('id', user.id);
  };

  const handleStep1 = async (data: BusinessFormData, brand: BrandFormData) => {
    setBusinessData(data);
    setBrandFormData(brand);

    if (user) {
      await supabase.from('business_profiles').upsert(
        {
          user_id: user.id,
          business_name: data.business_name,
          industry: data.industry,
          description: data.description || null,
          location: data.location || null,
          website: data.website || null,
          whatsapp: data.whatsapp || null,
          logo_url: brand.logo_url,
          brand_colors: brand.brand_colors,
          brand_typography: brand.brand_typography,
        },
        { onConflict: 'user_id' }
      );
    }

    await saveStep(1);
    setCurrentStep(1);
  };

  const handleStep2 = async (data: {
    ad_account_id: string;
    ad_account_name: string;
    page_id: string;
    page_name: string;
    pixel_id: string;
    pixel_name: string;
  }) => {
    setMetaSelections(data);

    if (user && metaConnection) {
      await supabase
        .from('meta_connections')
        .update({
          ad_account_id: data.ad_account_id,
          ad_account_name: data.ad_account_name,
          page_id: data.page_id,
          page_name: data.page_name,
          pixel_id: data.pixel_id || null,
          pixel_name: data.pixel_name || null,
        })
        .eq('id', metaConnection.id);
    }

    await saveStep(2);
    setCurrentStep(2);
  };

  const handleSkipMeta = async () => {
    setMetaSelections(null);
    await saveStep(2);
    setCurrentStep(2);
  };

  const handleStep3 = async (data: GoalsFormData) => {
    setGoalsData(data);

    if (user) {
      await supabase
        .from('business_profiles')
        .update({
          objectives: data.objectives,
          monthly_budget: data.monthly_budget,
          experience_level: data.experience_level,
          brand_tone: data.brand_tone,
        })
        .eq('user_id', user.id);
    }

    await saveStep(3);
    setCurrentStep(3);
  };

  const handleStep4Personas = async (data: { buyer_personas: BuyerPersona[]; sales_angles: SalesAngle[] }) => {
    setPersonasData(data);

    if (user) {
      await supabase
        .from('business_profiles')
        .update({
          buyer_personas: data.buyer_personas,
          sales_angles: data.sales_angles,
        })
        .eq('user_id', user.id);
    }

    await saveStep(4);
    setCurrentStep(4);
  };

  const handleSkipPersonas = async () => {
    await saveStep(4);
    setCurrentStep(4);
  };

  const handleConfirm = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 5,
        })
        .eq('id', user.id);

      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Error al completar el onboarding. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center py-8">
      <div className="w-full max-w-2xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">MetaAds Autopilot</span>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          {stepLabels.map((label, index) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                <span className="text-xs mt-1.5 text-muted-foreground">{label}</span>
              </div>
              {index < stepLabels.length - 1 && (
                <div
                  className={cn(
                    'w-12 md:w-20 h-0.5 mx-2 mb-5',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="transition-all duration-300">
          {currentStep === 0 && (
            <Step1Business
              defaultValues={businessData || undefined}
              defaultBrand={brandFormData || undefined}
              onNext={handleStep1}
            />
          )}
          {currentStep === 1 && (
            <Step2Meta
              connection={metaConnection}
              metaError={metaError}
              onNext={handleStep2}
              onSkip={handleSkipMeta}
              onBack={() => setCurrentStep(0)}
            />
          )}
          {currentStep === 2 && (
            <Step3Goals
              defaultValues={goalsData || undefined}
              onNext={handleStep3}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <Step4Personas
              defaultPersonas={personasData?.buyer_personas}
              defaultAngles={personasData?.sales_angles}
              onNext={handleStep4Personas}
              onSkip={handleSkipPersonas}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && businessData && goalsData && (
            <Step4Summary
              businessData={businessData}
              metaData={metaSelections || { ad_account_name: '', page_name: '', pixel_name: '' }}
              goalsData={goalsData}
              onConfirm={handleConfirm}
              onBack={() => setCurrentStep(3)}
              loading={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
