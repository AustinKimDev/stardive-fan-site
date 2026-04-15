import { useState, useRef, useEffect } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  fullWidth?: boolean;
}

export function CopyButton({ value, label = '복사', fullWidth = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // prefers-reduced-motion 감지
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
      // 클립보드 실패 시 폴백 — 무시
    }
    setCopied(true);

    if (btnRef.current && !prefersReduced.current) {
      const el = btnRef.current;
      // translateY(-4px) rise
      el.classList.add('copy-animate');
      // ring pulse
      el.classList.add('copy-success');
      setTimeout(() => {
        el.classList.remove('copy-animate');
        el.classList.remove('copy-success');
      }, 400);
    }

    // 햅틱
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
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
        padding: '0.625rem 1rem',
        borderRadius: '0',
        background: copied
          ? 'oklch(0.86 0.085 335 / 0.25)'
          : 'var(--accent)',
        color: copied
          ? 'var(--accent)'
          : 'oklch(0.14 0.045 268)',
        fontFamily: "'SUIT Variable', 'SUIT', sans-serif",
        fontWeight: 700,
        fontSize: '0.875rem',
        letterSpacing: '0.03em',
        border: copied
          ? '1px solid oklch(0.87 0.055 290 / 0.6)'
          : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 200ms, color 200ms, border-color 200ms',
        outlineOffset: '2px',
        outline: '2px solid transparent',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {copied ? '복사됨 ✓' : label}
    </button>
  );
}
