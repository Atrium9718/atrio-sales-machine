import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColombianPhone, parseColombianPhone } from '@fusion/core/voice/normalizePhone';

describe('Normalización de Teléfonos Colombianos (E.164)', () => {
  it('1. Celular estándar de 10 dígitos (3001234567) -> +573001234567', () => {
    assert.equal(normalizeColombianPhone('3001234567'), '+573001234567');
  });

  it('2. Celular con prefijo 03 antiguo (03001234567) -> +573001234567', () => {
    assert.equal(normalizeColombianPhone('03001234567'), '+573001234567');
  });

  it('3. Celular con código de país 57 (573001234567) -> +573001234567', () => {
    assert.equal(normalizeColombianPhone('573001234567'), '+573001234567');
  });

  it('4. Celular con formato internacional (+573001234567) -> +573001234567', () => {
    assert.equal(normalizeColombianPhone('+573001234567'), '+573001234567');
  });

  it('5. Celular con formato con espacios y guiones: +57 312 456-7890 -> +573124567890', () => {
    assert.equal(normalizeColombianPhone('+57 312 456-7890'), '+573124567890');
  });

  it('6. Fijo de Manizales de 7 dígitos sin indicativo (8801234) -> +576068801234', () => {
    assert.equal(normalizeColombianPhone('8801234'), '+576068801234');
  });

  it('7. Fijo de Manizales con 8 y 7 dígitos (8754321) -> +576068754321', () => {
    assert.equal(normalizeColombianPhone('8754321'), '+576068754321');
  });

  it('8. Fijo del Eje Cafetero con indicativo 606 (6068801234) -> +576068801234', () => {
    assert.equal(normalizeColombianPhone('6068801234'), '+576068801234');
  });

  it('9. Fijo de Bogotá con indicativo 601 (6013141516) -> +576013141516', () => {
    assert.equal(normalizeColombianPhone('6013141516'), '+576013141516');
  });

  it('10. Fijo de Medellín con indicativo 604 (6044445566) -> +576044445566', () => {
    assert.equal(normalizeColombianPhone('6044445566'), '+576044445566');
  });

  it('11. Fijo de Cali con indicativo 602 (6028889900) -> +576028889900', () => {
    assert.equal(normalizeColombianPhone('6028889900'), '+576028889900');
  });

  it('12. Fijo de Barranquilla con indicativo 605 (6053334455) -> +576053334455', () => {
    assert.equal(normalizeColombianPhone('6053334455'), '+576053334455');
  });

  it('13. Formato sucio con paréntesis y símbolos: "(606) 880-1234 ext 0" -> +576068801234', () => {
    assert.equal(normalizeColombianPhone('(606) 880-1234'), '+576068801234');
  });

  it('14. Llamada anónima o privada devuelve null', () => {
    assert.equal(normalizeColombianPhone('anonymous'), null);
    assert.equal(normalizeColombianPhone('Desconocido'), null);
    assert.equal(normalizeColombianPhone('private'), null);
  });

  it('15. Texto inválido devuelve null', () => {
    assert.equal(normalizeColombianPhone('abcdefg'), null);
    assert.equal(normalizeColombianPhone('123'), null);
    assert.equal(normalizeColombianPhone(''), null);
  });

  it('16. Parseo completo devuelve metadatos regionales y tipo de línea', () => {
    const parsedManizales = parseColombianPhone('8801234');
    assert.ok(parsedManizales);
    assert.equal(parsedManizales.type, 'LANDLINE');
    assert.equal(parsedManizales.region, 'Caldas / Manizales / Eje Cafetero');

    const parsedMobile = parseColombianPhone('3101234567');
    assert.ok(parsedMobile);
    assert.equal(parsedMobile.type, 'MOBILE');
  });
});
