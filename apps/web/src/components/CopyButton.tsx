import { useState, useRef, useEffect } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  fullWidth?: boolean;
}

export function CopyButton({ value, label = 'COPY', fullWidth = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const prefersReduced = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback — ignore
    }
    setCopied(true);

    if (btnRef.current && !prefersReduced.current) {
      const el = btnRef.current;
      el.classList.add('copy-animate');
      el.classList.add('copy-success');
      setTimeout(() => {
        el.classList.remove('copy-animate');
        el.classList.remove('copy-success');
      }, 350);
    }

    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-live="polite"
      aria-label={copied ? '코드 복사됨' : `${value} 복사`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : undefined,
        padding: '5px 12px',
        borderRadius: '0',
        background: copied
          ? 'oklch(0.76 0.14 220 / 0.18)'
          : 'transparent',
        color: 'oklch(0.76 0.14 220)',
        fontFamily: "'SUIT Variable', 'SUIT', sans-serif",
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        border: '1px solid oklch(0.76 0.14 220 / 0.5)',
        cursor: 'pointer',
        transition: 'background 180ms, color 180ms, border-color 180ms',
        outlineOffset: '1px',
        outline: '2px solid transparent',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        textTransform: 'uppercase' as const,
      }}
    >
      {copied ? '✓ 복사됨' : label}
    </button>
  );
}
