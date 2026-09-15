import { renderTemplate } from '@common/utils/template-renderer.util';

describe('renderTemplate', () => {
  it('substitutes matching placeholders', () => {
    expect(renderTemplate('Hi {{name}}, code: {{code}}', { name: 'Ada', code: '1234' })).toBe('Hi Ada, code: 1234');
  });

  it('replaces a missing key with an empty string rather than leaving the placeholder', () => {
    expect(renderTemplate('Hi {{name}}', {})).toBe('Hi ');
  });

  it('leaves the string unchanged when there are no placeholders', () => {
    expect(renderTemplate('Plain text', { name: 'Ada' })).toBe('Plain text');
  });

  it('handles repeated placeholders', () => {
    expect(renderTemplate('{{x}} and {{x}}', { x: 'Y' })).toBe('Y and Y');
  });
});
