import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCOPInput, formatCOPInput } from '../src/utils/copInput.js';
import { productoBody } from '../src/services/productosService.js';

for (const [input, expected] of [
  ['3500', 3500], ['3.500', 3500], ['2844,44', 2844.44], ['2.844,44', 2844.44],
  ['3.500,00', 3500], ['0,01', 0.01], ['12,5', 12.5], ['1.234.567,89', 1234567.89],
  [' 3.500 ', 3500], ['0', 0],
]) test(`Entrada COP ${input} → ${expected}`, () => assert.equal(parseCOPInput(input), expected));

for (const input of ['', ' ', '3.5', '2844.44', '3,500', '2.84,44', '1,234.56', '3.500,',
  '1..000', '-3500', '1e3', 'Infinity', 'NaN', '$3.500', '3 500', null, undefined, 3.5]) {
  test(`Rechaza entrada inválida o ambigua: ${String(input)}`, () => assert.throws(() => parseCOPInput(input)));
}

test('Edición convierte números de API a texto COP sin reinterpretar decimales', () => {
  for (const value of [3.5, 3500, 2844.44, 19560, 0.01]) {
    assert.equal(parseCOPInput(formatCOPInput(value)), value);
  }
  assert.equal(formatCOPInput(3.5), '3,5');
});

test('Precio colombiano llega al contrato como número normal, conservando centavos', () => {
  for (const [input, expected] of [['3.500', 3500], ['2.844,44', 2844.44]]) {
    const body = productoBody({ nombre: 'Producto', codigo: 'P1', precio_venta: parseCOPInput(input),
      cantidad: 0, stock_minimo: 0, categorias_id: '1', proveedores_id: 'proveedor' });
    assert.equal(typeof body.precio_venta, 'number');
    assert.equal(JSON.parse(JSON.stringify(body)).precio_venta, expected);
  }
});

test('El contrato sigue rechazando precio cero', () => {
  assert.throws(() => productoBody({ nombre: 'Producto', codigo: 'P1', precio_venta: parseCOPInput('0'),
    cantidad: 0, stock_minimo: 0, categorias_id: '1', proveedores_id: 'proveedor' }));
});
