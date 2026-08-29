'use client';

import type React from 'react';

import {
  Calendar,
  Users,
  Trophy,
  BarChart3,
  Shield,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { BGGrid } from '@/components/ui/bg-grid';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

const features: Feature[] = [
  {
    title: 'Smart Event Discovery',
    description:
      'AI-powered recommendations help you find events that match your interests and skill level across 200+ colleges.',
    icon: Calendar,
  },
  {
    title: 'Team Formation',
    description:
      'Connect with like-minded students and form teams for competitions and projects. Build your network effortlessly.',
    icon: Users,
  },
  {
    title: 'Achievement Tracking',
    description:
      'Earn certificates, badges, and build your portfolio with every event you participate in. Showcase your growth.',
    icon: Trophy,
  },
  {
    title: 'Analytics Dashboard',
    description:
      'Track your progress, see your growth, and get insights into your learning journey with detailed analytics.',
    icon: BarChart3,
  },
  {
    title: 'Verified Events',
    description:
      'All events are verified by our team to ensure quality and authenticity. Join with confidence.',
    icon: Shield,
  },
  {
    title: 'Multi-Campus Network',
    description:
      'Connect with students from 200+ colleges across India and participate in inter-college events seamlessly.',
    icon: Globe,
  },
];

export default function FeaturesCards() {
  return (
    <section
      id="features"
      className="relative py-24 px-6 overflow-hidden 
            [mask-image:radial-gradient(ellipse_at_center,var(--background),transparent)]"
      style={{
        backgroundColor: '#000000',
        color: '#EEF2FF',
        backgroundImage: `
  linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px) ,
`,
        backgroundSize: '44px 44px',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          {/* Pill */}
          <div
            className="mb-8 inline-flex items-center rounded-full backdrop-blur-xl px-4 py-2 text-sm font-sans"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#EEF2FF',
            }}
          >
            Platform Features
          </div>

          {/* Heading */}
          <h2
            className="font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.15] mb-6"
            style={{ color: '#EEF2FF' }}
          >
            Campus Events, <br />
            Connected Seamlessly
          </h2>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg max-w-3xl"
            style={{ color: '#9AA0C7' }}
          >
            Clunite brings all your campus events, clubs, and opportunities
            together, letting you connect and grow effortlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;

            return (
              <div
                key={index}
                className="group relative"
                style={{ minHeight: '180px' }}
              >
                {/* Content */}
                <div
                  className="relative z-10 p-6 rounded-2xl h-full flex flex-col transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(0, 194, 255, 0.3)';
                    e.currentTarget.style.backgroundColor =
                      'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(255,255,255,0.06)';
                    e.currentTarget.style.backgroundColor =
                      'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="mb-4">
                    <IconComponent
                      className="w-8 h-8 transition-colors"
                      style={{ color: '#00C2FF' }}
                    />
                  </div>

                  <h3
                    className="text-lg font-bold mb-3 font-sans leading-[1.2] tracking-[-0.01em]"
                    style={{ color: '#EEF2FF' }}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="flex-grow text-sm font-sans leading-relaxed"
                    style={{ color: '#9AA0C7' }}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
