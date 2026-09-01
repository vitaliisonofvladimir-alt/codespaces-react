import { describe, expect, it } from 'vitest';
import { getAllowedOrigin } from './cors.js';

describe('getAllowedOrigin', () => {
  it('uses the production origin from ALLOWED_ORIGIN', () => {
    expect(
      getAllowedOrigin({ ALLOWED_ORIGIN: 'https://kvochkohin.site' })
    ).toBe('https://kvochkohin.site');
  });

  it('keeps localhost as the development default', () => {
    expect(getAllowedOrigin({})).toBe('http://localhost:3000');
  });
});
