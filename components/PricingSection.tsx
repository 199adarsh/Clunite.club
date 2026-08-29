'use client';

import { cn } from '@/lib/utils';
import { PricingCardSimple, PricingCardAdvanced } from './PricingCard';

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
}

interface PricingSectionProps {
  plans: PricingPlan[];
  className?: string;
}

export function PricingSection({ plans, className }: PricingSectionProps) {
  return (
    <section className={cn('py-12 px-6', className)}>
      {/* UNIFIED WIDTH FOR ALL CARDS */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* SIMPLE CARDS */}
        <div className="grid md:grid-cols-2 gap-6 w-full">
          {plans
            .filter(
              (p) =>
                p.name.toLowerCase() === 'student' ||
                p.name.toLowerCase() === 'institution'
            )
            .map((plan, index) => (
              <PricingCardSimple key={index} {...plan} />
            ))}
        </div>

        {/* ORGANIZER CARD */}
        <div className="w-full">
          {plans
            .filter((p) => p.name.toLowerCase() === 'organizer')
            .map((plan, index) => (
              <PricingCardAdvanced
                key={index}
                title={plan.name}
                description={plan.description}
                price={parseInt(plan.price.replace(/[^0-9]/g, ''))}
                features={[
                  {
                    title: 'Everything Included',
                    items: plan.features,
                  },
                ]}
                buttonText={plan.cta}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
