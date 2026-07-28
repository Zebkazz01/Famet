import { describe, it, expect } from 'vitest';
import { parseScaleData } from '../scaleParser';

describe('parseScaleData', () => {
  describe('Format A: ST,GS / US,NT protocol', () => {
    it('parses stable weight in kg', () => {
      const result = parseScaleData('ST,GS,+  1.250kg');
      expect(result).toEqual({
        weight: 1.25,
        unit: 'kg',
        stable: true,
        raw: 'ST,GS,+  1.250kg',
      });
    });

    it('parses unstable weight', () => {
      const result = parseScaleData('US,GS,+ 0.800kg');
      expect(result).toEqual({
        weight: 0.8,
        unit: 'kg',
        stable: false,
        raw: 'US,GS,+ 0.800kg',
      });
    });

    it('parses negative weight', () => {
      const result = parseScaleData('ST,NT,- 0.500kg');
      expect(result).toEqual({
        weight: -0.5,
        unit: 'kg',
        stable: true,
        raw: 'ST,NT,- 0.500kg',
      });
    });

    it('defaults unit to kg when not specified', () => {
      const result = parseScaleData('ST,GS,+ 2.000');
      expect(result?.unit).toBe('kg');
    });

    it('parses gram unit', () => {
      const result = parseScaleData('ST,GS,+ 1250g');
      expect(result).toEqual({
        weight: 1250,
        unit: 'g',
        stable: true,
        raw: 'ST,GS,+ 1250g',
      });
    });

    it('parses pound unit', () => {
      const result = parseScaleData('US,GS,+ 2.5lb');
      expect(result).toEqual({
        weight: 2.5,
        unit: 'lb',
        stable: false,
        raw: 'US,GS,+ 2.5lb',
      });
    });
  });

  describe('Format B: = / + / - prefix protocol', () => {
    it('parses stable weight with = prefix', () => {
      const result = parseScaleData('= 1.250 kg');
      expect(result).toEqual({
        weight: 1.25,
        unit: 'kg',
        stable: true,
        raw: '= 1.250 kg',
      });
    });

    it('parses unstable weight with + prefix', () => {
      const result = parseScaleData('+ 0.500 kg');
      expect(result).toEqual({
        weight: 0.5,
        unit: 'kg',
        stable: false,
        raw: '+ 0.500 kg',
      });
    });

    it('parses negative weight with - prefix', () => {
      const result = parseScaleData('- 0.100 kg');
      expect(result).toEqual({
        weight: -0.1,
        unit: 'kg',
        stable: false,
        raw: '- 0.100 kg',
      });
    });

    it('defaults unit to kg', () => {
      const result = parseScaleData('= 3.000');
      expect(result?.unit).toBe('kg');
    });
  });

  describe('Format C: pure numeric', () => {
    it('parses decimal number', () => {
      const result = parseScaleData('0001.250');
      expect(result).toEqual({
        weight: 1.25,
        unit: 'kg',
        stable: true,
        raw: '0001.250',
      });
    });

    it('parses simple decimal', () => {
      const result = parseScaleData('1.250');
      expect(result).toEqual({
        weight: 1.25,
        unit: 'kg',
        stable: true,
        raw: '1.250',
      });
    });

    it('parses negative pure numeric (matches Format B first)', () => {
      const result = parseScaleData('-1.250');
      expect(result).toEqual({
        weight: -1.25,
        unit: 'kg',
        stable: false, // Format B '-' prefix → unstable
        raw: '-1.250',
      });
    });
  });

  describe('Edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseScaleData('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseScaleData('   ')).toBeNull();
    });

    it('returns null for unparseable text', () => {
      expect(parseScaleData('ERROR')).toBeNull();
    });

    it('returns null for random garbage', () => {
      expect(parseScaleData('hello world 123')).toBeNull();
    });

    it('trims whitespace before parsing', () => {
      const result = parseScaleData('  ST,GS,+ 1.000kg  ');
      expect(result).not.toBeNull();
      expect(result?.weight).toBe(1.0);
    });

    it('handles zero weight', () => {
      const result = parseScaleData('ST,GS,+ 0.000kg');
      expect(result?.weight).toBe(0);
    });
  });
});
