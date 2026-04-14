import React from 'react';
import { FileMusic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  className?: string;
}

export const FileDropZone = ({ onFilesDrop, className = "" }: FileDropZoneProps) => {
  const { t } = useTranslation();
  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-studio-border rounded-xl hover:border-studio-accent/50 transition-colors group cursor-pointer bg-slate-900/50">
        <FileMusic className="w-8 h-8 text-slate-500 group-hover:text-studio-accent transition-colors mb-2" />
        <p className="text-slate-400 group-hover:text-slate-200 transition-colors text-xs text-center font-medium">
          {t('import_midi')}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">{t('drag_files_here')}</p>
        <input
          type="file"
          multiple
          accept=".mid,.midi"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onFilesDrop(files);
          }}
        />
      </div>
    </div>
  );
};
