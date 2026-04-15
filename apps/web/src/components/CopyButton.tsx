import { useState, useRef } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = '복사' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const onClick = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);

    // 시그니처 모션: translateY(-4px) + periwinkle ring pulse
    if (btnRef.current) {
      const el = btnRef.current;
      el.classList.add('copy-animate');
      // navigator.vibrate?.(8)
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
      }
      setTimeout(() => el.classList.remove('copy-animate'), 400);
    }

    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-live="polite"
      style={{
        padding: '0.375rem 0.75rem',
        borderRadius: '0.375rem',
        background: copied ? 'oklch(0.87 0.055 290 / 0.2)' : 'oklch(0.86 0.085 335)',
        color: copied ? 'oklch(0.87 0.055 290)' : 'oklch(0.14 0.045 268)',
        fontWeight: 600,
        fontSize: '0.875rem',
        border: copied ? '1px solid oklch(0.87 0.055 290)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 200ms, color 200ms',
        outlineOffset: '2px',
        outline: '2px solid transparent',
      }}
    >
      {copied ? '복사됨 ✓' : label}
    </button>
  );
}
