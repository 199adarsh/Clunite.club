'use client';

import React, { useState } from 'react';

export default function FAQSection() {
  const [query, setQuery] = useState('');

  const faqs = [
    {
      q: 'What does your team do?',
      a: 'We design and build digital products end-to-end: research, UX/UI, front-end/back-end, infrastructure, and release support.',
    },
    {
      q: 'How is your workflow structured?',
      a: 'Iteratively. Solution storyboards → quick prototypes → user testing → prioritization → production integration.',
    },
    {
      q: 'Which stack and tools do you use?',
      a: 'TypeScript/React/Next.js, Node.js, Python, Postgres, Redis, Tailwind, Playwright, CI/CD on GitHub Actions.',
    },
    {
      q: 'Can we see code or a demo?',
      a: 'Yes. We prepare private demo environments, give repository access and supply documented examples.',
    },
    {
      q: 'How do you estimate timelines and budgets?',
      a: 'We evaluate MVPs by value/complexity impact metrics. Then lock sprints with clear checkpoints.',
    },
    {
      q: 'Do you take over existing products?',
      a: 'Yes. We audit, clean up architecture and CI/CD, eliminate technical debt, and take over under SLA.',
    },
  ];

  const filteredFaqs = query
    ? faqs.filter(({ q, a }) =>
        (q + a).toLowerCase().includes(query.toLowerCase())
      )
    : faqs;

  return (
    <div className="w-full bg-black text-white py-16 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-10 flex items-end justify-between border-b border-white/20 pb-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              FAQ
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/70">
              Clean, minimalistic, black-and-white.
            </p>
          </div>

          <div className="flex items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-10 w-56 rounded-xl border border-white/20 bg-transparent px-3 text-sm outline-none transition focus:border-white/60"
            />
          </div>
        </header>

        {/* FAQ Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFaqs.map((item, index) => (
            <FAQItem key={index} q={item.q} a={item.a} index={index + 1} />
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} Your team — products that move metrics.
        </footer>
      </div>
    </div>
  );
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group relative rounded-2xl border border-white/15 bg-black/40 p-5 transition hover:border-white/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-white/40">
            {String(index).padStart(2, '0')}
          </span>
          <h3 className="text-base md:text-lg font-semibold">{q}</h3>
        </div>

        <span className="text-white/60 group-hover:text-white transition">
          {open ? '–' : '+'}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="text-sm text-white/70">{a}</p>
        </div>
      </div>
    </div>
  );
}
