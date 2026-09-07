'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, Language } from '../lib/types';
import { translations, formatPlural } from '../lib/i18n';
import { ParsedTagItem, ImportParseResult, parseTagsFromFile } from '../lib/tagImporter';
import { 
  FileSpreadsheet, X, Upload, CheckCircle2, AlertTriangle, 
  FileText, ArrowRight, RefreshCw, Layers 
} from 'lucide-react';

interface ImportTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tags: ParsedTagItem[], mode: 'append' | 'replace') => void;
  tab: ActiveTab;
  lang: Language;
}

export const ImportTagsModal: React.FC<ImportTagsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  tab,
  lang,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setParseResult(null);
      setIsProcessing(false);
      setIsDragging(false);
      setImportMode('append');
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const result = await parseTagsFromFile(file);
      setParseResult(result);
    } catch (err: any) {
      setParseResult({
        success: false,
        filename: file.name,
        totalDetected: 0,
        tags: [],
        errors: [err?.message || 'Ошибка чтения файла'],
        format: 'xlsx',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.tags.length > 0) {
      onImport(parseResult.tags, importMode);
      onClose();
    }
  };

  const previewRows = parseResult ? parseResult.tags.slice(0, 8) : [];
  const remainingCount = parseResult ? Math.max(0, parseResult.tags.length - 8) : 0;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-tags-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="import-tags-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
                {t.importModalTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {t.importModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* File Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-[#00A3B5] bg-[#00A3B5]/10 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-[#00646E] dark:hover:border-[#00A3B5] bg-slate-50/50 dark:bg-slate-900/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleInputChange}
              className="hidden"
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <RefreshCw className="w-8 h-8 text-[#00A3B5] animate-spin" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'ru' ? 'Разбор структуры таблицы TIA Portal...' : 'Parsing TIA Portal table structure...'}
                </span>
              </div>
            ) : parseResult ? (
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{parseResult.filename}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      {parseResult.format.toUpperCase()}
                    </span>
                    {parseResult.sheetName && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        ({t.importSheetName} {parseResult.sheetName})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.importDetectedTags} <strong>{parseResult.totalDetected}</strong>{' '}
                    {formatPlural(parseResult.totalDetected, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#00646E]/10 dark:bg-[#00A3B5]/10 text-[#00646E] dark:text-[#00A3B5] flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.importDropTitle}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {t.importDropHint}
                </div>
              </>
            )}
          </div>

          {/* Errors Display */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{t.importToastError}</div>
                {parseResult.errors.map((err, i) => (
                  <div key={i} className="text-[11px] opacity-90">{err}</div>
                ))}
              </div>
            </div>
          )}

          {/* If tags parsed successfully: Options & Preview */}
          {parseResult && parseResult.success && parseResult.tags.length > 0 && (
            <>
              {/* Import Mode Radio Options */}
              <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  {t.importModeOptionTitle}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label 
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-white dark:bg-slate-900 border-[#00646E] dark:border-[#00A3B5] shadow-xs'
                        : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-[#00646E]"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {t.importModeAppend}
                    </span>
                  </label>

                  <label 
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-white dark:bg-slate-900 border-rose-500 shadow-xs'
                        : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-rose-500"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {t.importModeReplace}
                    </span>
                  </label>
                </div>
              </div>

              {/* Tag Preview Table */}
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  <span>{t.importPreviewTitle.replace('{n}', String(previewRows.length))}</span>
                  {remainingCount > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {lang === 'ru' ? `+ ещё ${remainingCount} тегов` : `+ ${remainingCount} more tags`}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5">{t.importColName}</th>
                        <th className="p-2.5">{t.importColType}</th>
                        <th className="p-2.5">{t.importColMode}</th>
                        <th className="p-2.5">{t.importColCycle}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {previewRows.map((tag, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2.5 font-mono text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                            {tag.name}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {tag.dataType}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              tag.mode === 'cyclic'
                                ? 'bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5]'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}>
                              {tag.mode === 'cyclic' ? 'Cyclic' : 'On Change'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {tag.cycleSec} s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.btnCancel}
          </button>
          <button
            type="button"
            disabled={!parseResult || !parseResult.success || parseResult.tags.length === 0 || isProcessing}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            {t.importBtnSubmit.replace('{n}', String(parseResult?.totalDetected || 0))}
          </button>
        </div>
      </div>
    </div>
  );
};
