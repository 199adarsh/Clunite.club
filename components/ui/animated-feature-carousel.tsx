'use client';

import React, { useEffect, useState } from 'react';

export interface Slide {
  title: string;
  subtitle: string;
  image: string; // REQUIRED for image support
}

export function SimpleCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;

  useEffect(() => {
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, 5000);
    return () => clearTimeout(t);
  }, [index, total]);

  return (
    <div className="w-full">
      {/* CARD */}
      <div
        className="relative mb-10 p-10 rounded-xl transition-all duration-500 min-h-[420px] flex items-end overflow-hidden"
        style={{
          backgroundColor: 'rgba(26, 28, 32, 0.6)',
          border: '1px solid rgba(117, 139, 253, 0.2)',
        }}
      >
        {/* BACKGROUND IMAGE */}
        <img
          src={slides[index].image}
          alt={slides[index].title}
          className="absolute inset-0 w-full h-full object-cover opacity-25 transition-opacity duration-500"
        />

        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* CONTENT */}
        <div className="relative z-10 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-[#E2E8F0]">
            {slides[index].title}
          </h2>

          <p className="text-lg md:text-xl mb-6 text-[#F1F5F9] leading-relaxed">
            {slides[index].subtitle}
          </p>

          <button
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
            style={{ backgroundColor: '#3B82F6' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#22D3EE')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = '#3B82F6')
            }
          >
            Learn more →
          </button>
        </div>
      </div>

      {/* DOTS */}
      <div className="flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="h-2 w-6 rounded-full transition"
            style={{
              backgroundColor:
                i === index ? '#758bfd' : 'rgba(117, 139, 253, 0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
