'use client';
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export const TypewriterEffect = memo(({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    };
  });

  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const renderWords = () => {
    return (
      <div ref={ref} className='inline' aria-hidden="true">
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className='inline-block'>
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn(
                    `dark:text-white text-foreground opacity-0 transition-opacity duration-300 ease-in-out`,
                    word.className,
                    isInView ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                  aria-hidden="true"
                >
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </div>
    );
  };

  // Compose the full text for screen readers
  const fullText = words.map(w => w.text).join(' ');

  return (
    <div
      className={cn(
        'text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center',
        className
      )}
    >
      <span className="sr-only">{fullText}</span>
      {renderWords()}
      <span
        className={cn(
          'inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-blue-500 animate-blink',
          cursorClassName
        )}
        aria-hidden="true"
      ></span>
    </div>
  );
});

TypewriterEffect.displayName = 'TypewriterEffect';

export const TypewriterEffectSmooth = memo(({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    };
  });

  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const renderWords = () => {
    return (
      <div aria-hidden="true">
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className='inline-block'>
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn(`dark:text-white text-foreground `, word.className)}
                  aria-hidden="true"
                >
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </div>
    );
  };

  // Compose the full text for screen readers
  const fullText = words.map(w => w.text).join(' ');

  return (
    <div className={cn('flex space-x-1 my-6', className)}>
      <span className="sr-only">{fullText}</span>
      <div
        className={cn(
          'overflow-hidden pb-2 transition-all duration-2000 ease-linear',
          isInView ? 'w-fit' : 'w-0'
        )}
        ref={ref}
      >
        <div
          className='text-xs sm:text-base md:text-xl lg:text:3xl xl:text-5xl font-bold'
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {renderWords()}{' '}
        </div>{' '}
      </div>
      <span
        className={cn(
          'block rounded-sm w-[4px] h-4 sm:h-6 xl:h-12 bg-blue-500 animate-blink',
          cursorClassName
        )}
        aria-hidden="true"
      ></span>
    </div>
  );
});

TypewriterEffectSmooth.displayName = 'TypewriterEffectSmooth';

// Add this to your global CSS or Tailwind CSS configuration
// .animate-blink {
//   @apply animate-pulse;
// }
