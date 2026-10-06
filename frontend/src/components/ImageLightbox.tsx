import React, { useEffect, useState } from 'react';
import { X, Copy, Check, MapPin, Camera, Download, FileText } from 'lucide-react';
import { Phaste } from '../types';
import { getMediaUrl } from '../api';

interface ImageLightboxProps {
  phaste: Phaste | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ phaste, onClose }) => {
  const [copiedOcr, setCopiedOcr] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!phaste || !phaste.media_path) return null;

  const imageUrl = getMediaUrl(phaste.media_path);
  const location = phaste.metadata_context?.location?.formatted_location;
  const camera = phaste.metadata_context?.exif?.camera_model;

  const handleCopyOcr = () => {
    if (phaste.ocr_transcript) {
      navigator.clipboard.writeText(phaste.ocr_transcript);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[90vh] bg-md3-surface-container rounded-md3-xl border border-md3-outline-variant/30 shadow-md3-5 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Preview Container */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[300px] max-h-[60vh] md:max-h-none overflow-hidden">
          <img
            src={imageUrl}
            alt={phaste.title || 'Image'}
            className="max-w-full max-h-[75vh] object-contain rounded-md3-md"
          />
        </div>

        {/* Metadata & OCR Sidepanel */}
        <div className="w-full md:w-80 p-5 bg-md3-surface-container flex flex-col gap-4 overflow-y-auto max-h-[40vh] md:max-h-[85vh] border-t md:border-t-0 md:border-l border-md3-outline-variant/20">
          <div>
            <h3 className="text-sm font-semibold text-md3-on-surface line-clamp-2">
              {phaste.title || 'Untitled Image'}
            </h3>
            <p className="text-[11px] text-md3-on-surface-variant mt-0.5">
              {new Date(phaste.created_at).toLocaleString()}
            </p>
          </div>

          {/* Location Badge */}
          {location && (
            <div className="flex items-start gap-2 p-2.5 rounded-md3-md bg-md3-surface-container-low border border-md3-outline-variant/20 text-xs">
              <MapPin className="w-4 h-4 text-md3-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-md3-on-surface">Location</span>
                <p className="text-md3-on-surface-variant text-[11px]">{location}</p>
              </div>
            </div>
          )}

          {/* Camera EXIF */}
          {camera && (
            <div className="flex items-start gap-2 p-2.5 rounded-md3-md bg-md3-surface-container-low border border-md3-outline-variant/20 text-xs">
              <Camera className="w-4 h-4 text-md3-outline shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-md3-on-surface">Camera</span>
                <p className="text-md3-on-surface-variant text-[11px]">{camera}</p>
              </div>
            </div>
          )}

          {/* OCR Transcript Box */}
          {phaste.ocr_transcript && (
            <div className="flex flex-col gap-2 p-3 rounded-md3-md bg-md3-surface-container-lowest border border-md3-outline-variant/30">
              <div className="flex items-center justify-between text-xs font-medium text-md3-on-surface">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-md3-primary" />
                  <span>OCR Text Detected</span>
                </span>
                <button
                  onClick={handleCopyOcr}
                  className="flex items-center gap-1 text-[11px] text-md3-primary hover:underline"
                >
                  {copiedOcr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedOcr ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-md3-on-surface-variant font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed select-text">
                {phaste.ocr_transcript}
              </p>
            </div>
          )}

          {/* Action Links */}
          <div className="mt-auto pt-4 flex gap-2">
            <a
              href={imageUrl}
              download
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-md3-primary-container text-md3-on-primary-container text-xs font-medium hover:brightness-110 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Original</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
