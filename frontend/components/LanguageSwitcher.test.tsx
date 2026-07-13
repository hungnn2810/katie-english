import { Simulate } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';
import React, { act } from 'react';

jest.mock('next-intl', () => ({
  useLocale: () => 'vi',
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/i18n/actions', () => ({
  setLocale: jest.fn().mockResolvedValue(undefined),
}));

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { setLocale } from '@/lib/i18n/actions';
import LanguageSwitcher from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    document.body.removeChild(container);
  });

  it('opens a menu with English and Tiếng Việt options when the trigger button is clicked', async () => {
    await act(async () => {
      root.render(<LanguageSwitcher />);
    });

    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger).toBeTruthy();

    await act(async () => {
      Simulate.click(trigger);
    });

    const menuText = document.body.textContent ?? '';
    expect(menuText).toContain('English');
    expect(menuText).toContain('Tiếng Việt');
  });

  it('calls setLocale("en") and router.refresh() when the English menu item is clicked', async () => {
    await act(async () => {
      root.render(<LanguageSwitcher />);
    });

    const trigger = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      Simulate.click(trigger);
    });

    const menuItems = Array.from(document.querySelectorAll('li[role="menuitem"]'));
    const englishItem = menuItems.find((el) => el.textContent?.includes('English')) as HTMLElement;
    expect(englishItem).toBeTruthy();

    await act(async () => {
      Simulate.click(englishItem);
    });

    expect(setLocale).toHaveBeenCalledWith('en');
    expect(mockRefresh).toHaveBeenCalled();
  });
});
