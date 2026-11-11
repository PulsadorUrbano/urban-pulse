import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

import { resolveBackendAssetUrl } from '../constants/config';
import type { CreatedIncidentImage } from '../types/incident';

interface IncidentGalleryProps {
  title: string;
  images: CreatedIncidentImage[];
}

export function IncidentGallery({ title, images }: IncidentGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentImage = images[Math.min(selectedImageIndex, images.length - 1)];
  const currentImageUrl = currentImage ? resolveBackendAssetUrl(currentImage.url) : null;

  return (
    <>
      <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
            Evidencia Fotográfica {images.length > 0 && `(${images.length})`}
          </h3>
          <button
            type="button"
            disabled={!currentImageUrl}
            onClick={() => setIsZoomed(true)}
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Maximize2 className="w-4 h-4" /> Agrandar
          </button>
        </div>
        <div className="relative bg-zinc-100 dark:bg-black h-64 md:h-80 w-full p-2">
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt={`Evidencia de la incidencia ${title}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              La incidencia no tiene imágenes.
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 p-3 border-t border-zinc-100 dark:border-zinc-800/60 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`w-16 h-16 shrink-0 rounded-md overflow-hidden border-2 ${
                  index === selectedImageIndex ? 'border-zinc-900 dark:border-zinc-100' : 'border-transparent'
                }`}
                title={`Imagen ${index + 1} de ${images.length}`}
              >
                <img src={resolveBackendAssetUrl(image.url)} alt={`Miniatura ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isZoomed && currentImageUrl && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col">
          <div className="flex justify-end p-6">
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-transform hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 p-4 md:p-12 overflow-hidden flex items-center justify-center">
            <img
              src={currentImageUrl}
              alt="Evidencia ampliada"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
