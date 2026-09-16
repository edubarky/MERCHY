-- MERCHY — Carga los precios reales de Grabado Láser y Bordado, con la
-- misma estructura que ya usan DTF Textil/DTF UV (pricing_type "by_size"),
-- traduciendo los escalones de ONPOINT (Largo+Alto sumados: 4/8/12 cm para
-- Láser, 10/20/40 cm para Bordado) a cuadros width×height equivalentes
-- (4x4/8x8/12x12, 10x10/20x20/40x40) — mismos precios reales, mismos
-- escalones de cantidad, solo adaptado al mecanismo que ya sabe leer el
-- Personalizador de MERCHY. Ver charla 2026-09-16.
-- Correr en Supabase SQL Editor.

update print_techniques
set pricing_type = 'by_size',
    price_table = '[
      {"size":"4x4","qty_min":1,"qty_max":9,"price_per_element":49},
      {"size":"4x4","qty_min":10,"qty_max":49,"price_per_element":24},
      {"size":"4x4","qty_min":50,"qty_max":99,"price_per_element":18},
      {"size":"4x4","qty_min":100,"qty_max":499,"price_per_element":14},
      {"size":"4x4","qty_min":500,"qty_max":999,"price_per_element":10},
      {"size":"4x4","qty_min":1000,"qty_max":15000,"price_per_element":7},
      {"size":"8x8","qty_min":1,"qty_max":9,"price_per_element":63},
      {"size":"8x8","qty_min":10,"qty_max":49,"price_per_element":31},
      {"size":"8x8","qty_min":50,"qty_max":99,"price_per_element":23},
      {"size":"8x8","qty_min":100,"qty_max":499,"price_per_element":18},
      {"size":"8x8","qty_min":500,"qty_max":999,"price_per_element":13},
      {"size":"8x8","qty_min":1000,"qty_max":15000,"price_per_element":10},
      {"size":"12x12","qty_min":1,"qty_max":9,"price_per_element":78},
      {"size":"12x12","qty_min":10,"qty_max":49,"price_per_element":39},
      {"size":"12x12","qty_min":50,"qty_max":99,"price_per_element":28},
      {"size":"12x12","qty_min":100,"qty_max":499,"price_per_element":22},
      {"size":"12x12","qty_min":500,"qty_max":999,"price_per_element":16},
      {"size":"12x12","qty_min":1000,"qty_max":15000,"price_per_element":12}
    ]'::jsonb
where name = 'Grabado en Láser';

update print_techniques
set pricing_type = 'by_size',
    price_table = '[
      {"size":"10x10","qty_min":1,"qty_max":9,"price_per_element":35},
      {"size":"10x10","qty_min":10,"qty_max":49,"price_per_element":32},
      {"size":"10x10","qty_min":50,"qty_max":99,"price_per_element":29},
      {"size":"10x10","qty_min":100,"qty_max":499,"price_per_element":26},
      {"size":"10x10","qty_min":500,"qty_max":999,"price_per_element":24},
      {"size":"10x10","qty_min":1000,"qty_max":5000,"price_per_element":22},
      {"size":"20x20","qty_min":1,"qty_max":9,"price_per_element":60},
      {"size":"20x20","qty_min":10,"qty_max":49,"price_per_element":56},
      {"size":"20x20","qty_min":50,"qty_max":99,"price_per_element":52},
      {"size":"20x20","qty_min":100,"qty_max":499,"price_per_element":48},
      {"size":"20x20","qty_min":500,"qty_max":999,"price_per_element":44},
      {"size":"20x20","qty_min":1000,"qty_max":5000,"price_per_element":40},
      {"size":"40x40","qty_min":1,"qty_max":9,"price_per_element":110},
      {"size":"40x40","qty_min":10,"qty_max":49,"price_per_element":104},
      {"size":"40x40","qty_min":50,"qty_max":99,"price_per_element":98},
      {"size":"40x40","qty_min":100,"qty_max":499,"price_per_element":92},
      {"size":"40x40","qty_min":500,"qty_max":999,"price_per_element":86},
      {"size":"40x40","qty_min":1000,"qty_max":5000,"price_per_element":80}
    ]'::jsonb
where name = 'Bordado';
