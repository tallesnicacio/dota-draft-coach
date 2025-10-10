import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  blurDataURL?: string;
  threshold?: number;
}

export const LazyImage = ({
  src,
  alt,
  fallbackSrc = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/default.png',
  blurDataURL,
  threshold = 0.1,
  className,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Intersection Observer para lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '50px', // Carregar 50px antes de aparecer na tela
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div className="relative inline-block w-full h-full">
      {/* Placeholder blur (opcional) */}
      {!isLoaded && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className={cn('absolute inset-0 w-full h-full blur-sm', className)}
          aria-hidden="true"
        />
      )}

      {/* Skeleton enquanto não carrega */}
      {!isLoaded && !blurDataURL && (
        <div
          className={cn(
            'absolute inset-0 w-full h-full bg-secondary/50 animate-pulse',
            className
          )}
          aria-hidden="true"
        />
      )}

      {/* Imagem real */}
      <img
        ref={imgRef}
        src={isInView ? (hasError ? fallbackSrc : src) : undefined}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        {...props}
      />
    </div>
  );
};
