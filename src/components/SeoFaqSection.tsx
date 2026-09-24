'use client';
import React from 'react';
import { Language } from '../lib/types';
import { translations } from '../lib/i18n';
import { HelpCircle, Coffee, BookOpen, ExternalLink, Calculator } from 'lucide-react';

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
          <article
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
            className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-[#00646E]/30 dark:border-[#00A3B5]/30 shadow-xs md:col-span-2 transition-all bg-gradient-to-br from-white/90 to-cyan-50/20 dark:from-slate-900/80 dark:to-slate-800/40"
          >
            <h4 itemProp="name" className="text-xs sm:text-sm font-bold text-[#00646E] dark:text-[#00A3B5] mb-2 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-[#00646E]/10 dark:bg-[#00A3B5]/15 border border-[#00646E]/20 dark:border-[#00A3B5]/20">Tag Logging</span>
              {t.faqQ5}
            </h4>
            <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.faqA5}
              </p>
            </div>
          </article>
        </div>
      </div>

      {/* Engineering Calculation Methodology & Formulas (AI-SEO & E-E-A-T) */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start">
          <Calculator className="w-5 h-5 text-[#00646E] dark:text-[#00A3B5]" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
            {t.methodologyHeading}
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {t.methodologyIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Formula 1: SQLite WAL */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#00646E] dark:text-[#00A3B5] font-bold mb-1">
                WinCC Unified
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.formulaSqliteTitle}
              </h4>
              <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] text-[#00646E] dark:text-[#00A3B5] mb-2 font-bold break-all">
                {t.formulaSqliteMath}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.formulaSqliteDesc}
            </p>
          </div>

          {/* Formula 2: Flash Life TBW */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                Flash Endurance
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.formulaFlashTitle}
              </h4>
              <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 mb-2 font-bold break-all">
                {t.formulaFlashMath}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.formulaFlashDesc}
            </p>
          </div>

          {/* Formula 3: Comfort RDB 500k */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">
                Comfort / Advanced
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.formulaComfortTitle}
              </h4>
              <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] text-amber-700 dark:text-amber-400 mb-2 font-bold break-all">
                {t.formulaComfortMath}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.formulaComfortDesc}
            </p>
          </div>

          {/* Formula 4: Professional Fast/Slow */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold mb-1">
                WinCC Professional / V7-V8
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.formulaProTitle}
              </h4>
              <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] text-blue-700 dark:text-blue-400 mb-2 font-bold break-all">
                {t.formulaProMath}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.formulaProDesc}
            </p>
          </div>

          {/* Formula 5: ISA-18.2 */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold mb-1">
                ISA-18.2 / IEC 62682 / EEMUA 191
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.formulaAlarmTitle}
              </h4>
              <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] text-purple-700 dark:text-purple-400 mb-2 font-bold break-all">
                {t.formulaAlarmMath}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.formulaAlarmDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Official Standards & SIOS Documentation References */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start">
          <BookOpen className="w-5 h-5 text-[#00646E] dark:text-[#00A3B5]" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
            {t.siosRefTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://support.industry.siemens.com/cs/document/109772222/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-[#00646E]/50 dark:hover:border-[#00A3B5]/50 transition-all flex items-start gap-2.5 group"
          >
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5]">
                {t.siosDocUnified}
              </div>
              <div className="text-[11px] text-slate-500">Siemens Industry Online Support (SIOS)</div>
            </div>
          </a>

          <a
            href="https://support.industry.siemens.com/cs/document/109746939/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-[#00646E]/50 dark:hover:border-[#00A3B5]/50 transition-all flex items-start gap-2.5 group"
          >
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5]">
                {t.siosDocComfort}
              </div>
              <div className="text-[11px] text-slate-500">Siemens Industry Online Support (SIOS)</div>
            </div>
          </a>

          <a
            href="https://support.industry.siemens.com/cs/document/109810540/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-[#00646E]/50 dark:hover:border-[#00A3B5]/50 transition-all flex items-start gap-2.5 group"
          >
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5]">
                {t.siosDocOpenness}
              </div>
              <div className="text-[11px] text-slate-500">Siemens Industry Online Support (SIOS)</div>
            </div>
          </a>

          <a
            href="https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa18"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-[#00646E]/50 dark:hover:border-[#00A3B5]/50 transition-all flex items-start gap-2.5 group"
          >
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00646E] dark:group-hover:text-[#00A3B5]">
                {t.siosDocIsa18}
              </div>
              <div className="text-[11px] text-slate-500">International Society of Automation (ISA)</div>
            </div>
          </a>
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
