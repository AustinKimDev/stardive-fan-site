import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyButton } from '../CopyButton';

describe('CopyButton', () => {
  it('클릭 시 navigator.clipboard.writeText 호출 후 "복사됨" 토글', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<CopyButton value="ABCDE" />);
    const btn = screen.getByRole('button', { name: /복사/ });
    await act(async () => { fireEvent.click(btn); });
    expect(write).toHaveBeenCalledWith('ABCDE');
    expect(screen.getByRole('button').textContent).toMatch(/복사됨/);
  });
});
