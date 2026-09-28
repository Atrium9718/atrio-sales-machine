import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeEmail, normalizeSocialId } from './normalization';

describe('Normalization', () => {
  describe('normalizePhone', () => {
    it('handles +57 numbers', () => {
      expect(normalizePhone('+573001234567')).toBe('+573001234567');
      expect(normalizePhone('+57 300 123 4567')).toBe('+573001234567');
    });

    it('handles 10 digit mobile numbers (CO default)', () => {
      expect(normalizePhone('3001234567')).toBe('+573001234567');
      expect(normalizePhone('300 123 4567')).toBe('+573001234567');
    });

    it('handles 11 digit numbers with leading 0', () => {
      expect(normalizePhone('03001234567')).toBe('+573001234567');
    });

    it('handles Manizales fixed numbers (606)', () => {
      expect(normalizePhone('(606) 8901234')).toBe('+576068901234');
      expect(normalizePhone('6068901234')).toBe('+576068901234');
    });

    it('returns null for invalid strings', () => {
      expect(normalizePhone('invalid')).toBe(null);
      expect(normalizePhone('')).toBe(null);
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail(' Test@Example.com ')).toBe('test@example.com');
    });

    it('removes gmail dots and aliases', () => {
      expect(normalizeEmail('user.name+tag@gmail.com')).toBe('username@gmail.com');
    });

    it('removes outlook/hotmail aliases', () => {
      expect(normalizeEmail('user+tag@outlook.com')).toBe('user@outlook.com');
      expect(normalizeEmail('user.name+tag@hotmail.com')).toBe('user.name@hotmail.com');
    });

    it('returns null for invalid emails', () => {
      expect(normalizeEmail('invalid-email')).toBe(null);
      expect(normalizeEmail('')).toBe(null);
    });
  });

  describe('normalizeSocialId', () => {
    it('trims string', () => {
      expect(normalizeSocialId('  12345  ', 'INSTAGRAM')).toBe('12345');
    });
  });
});
