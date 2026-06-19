import { formatPhoneForZalo } from './phone-formatter.util';

describe('formatPhoneForZalo', () => {
  it('converts 0912345678 to 84912345678', () => {
    expect(formatPhoneForZalo('0912345678')).toBe('84912345678');
  });

  it('is idempotent — 84912345678 stays 84912345678', () => {
    expect(formatPhoneForZalo('84912345678')).toBe('84912345678');
  });

  it('strips spaces — 0 912 345 678 becomes 84912345678', () => {
    expect(formatPhoneForZalo('0 912 345 678')).toBe('84912345678');
  });

  it('handles no leading 0 and no 84 prefix — prepends 84', () => {
    expect(formatPhoneForZalo('912345678')).toBe('84912345678');
  });

  it('strips hyphens', () => {
    expect(formatPhoneForZalo('0912-345-678')).toBe('84912345678');
  });

  it('strips parentheses', () => {
    expect(formatPhoneForZalo('(084)912345678')).toBe('8484912345678');
  });

  it('handles already-formatted number with trim', () => {
    expect(formatPhoneForZalo('  84912345678  ')).toBe('84912345678');
  });
});
