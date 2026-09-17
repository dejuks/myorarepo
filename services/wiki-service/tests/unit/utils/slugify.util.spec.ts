import { slugify } from '@common/utils/slugify.util';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Oromia Regional State')).toBe('oromia-regional-state');
  });

  it('collapses punctuation and repeated separators into single hyphens', () => {
    expect(slugify('Afaan Oromo: History & Culture!!')).toBe('afaan-oromo-history-culture');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Gadaa System--  ')).toBe('gadaa-system');
  });

  it('returns an empty string for a title with no letters or digits', () => {
    expect(slugify('---')).toBe('');
  });
});
