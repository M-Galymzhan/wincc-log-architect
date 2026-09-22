'use client';
import React from 'react';
import { Language } from '../lib/types';
import { translations } from '../lib/i18n';
import { HelpCircle, Coffee } from 'lucide-react';

interface SeoFaqSectionProps {
  lang: Language;
}

export const SeoFaqSection: React.FC<SeoFaqSectionProps> = React.memo(({ lang }) => {
  const t = translations[lang];

  return (
    <section className="mt-16 pt-10 border-t border-slate-200/80 dark:border-slate-800">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2.5 tracking-tight">
          {t.seoHeading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {t.seoIntro}
        </p>
      </div>

      {/* FAQ Cards Grid with Semantic Schema Microdata */}
      <div className="max-w-5xl mx-auto mb-12" itemScope itemType="https://schema.org/FAQPage">
        <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start">
          <HelpCircle className="w-5 h-5 text-[#00646E] dark:text-[#00A3B5]" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
            {t.faqTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
            className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-[#00646E]/30 dark:hover:border-[#00A3B5]/30 transition-all"
          >
            <h4 itemProp="name" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.faqQ1}
            </h4>
            <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.faqA1}
              </p>
            </div>
          </article>
          <article
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
            className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-[#00646E]/30 dark:hover:border-[#00A3B5]/30 transition-all"
          >
            <h4 itemProp="name" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.faqQ2}
            </h4>
            <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.faqA2}
              </p>
            </div>
          </article>
          <article
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
            className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-[#00646E]/30 dark:hover:border-[#00A3B5]/30 transition-all"
          >
            <h4 itemProp="name" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.faqQ3}
            </h4>
            <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.faqA3}
              </p>
            </div>
          </article>
          <article
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
            className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-[#00646E]/30 dark:hover:border-[#00A3B5]/30 transition-all"
          >
            <h4 itemProp="name" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.faqQ4}
            </h4>
            <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.faqA4}
              </p>
            </div>
          </article>
        </div>
      </div>

      {/* Support / Donation Footer */}
      <div className="pt-8 pb-12 border-t border-slate-200/60 dark:border-slate-800 text-center">
        <h3 className="text-xl sm:text-2xl font-bold mb-2.5 text-slate-900 dark:text-slate-100">
          {t.supportTitle}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
          {t.supportDesc}
        </p>
        <div className="flex items-center justify-center">
          <a
            href="https://ko-fi.com/glmm1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3 bg-[#FF5E5B] hover:bg-[#ff4542] text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-[#FF5E5B]/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Coffee className="w-5 h-5" />
            {t.kofiBtn}
          </a>
        </div>
        <div className="mt-8 text-xs sm:text-sm text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Siemens WinCC Log & Storage Architect • Open Source Engineering Tool
        </div>
      </div>
    </section>
  );
});

SeoFaqSection.displayName = 'SeoFaqSection';
