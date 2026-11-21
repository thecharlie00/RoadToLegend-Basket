(function (root) {
  'use strict';
  // Acciones · Jugada Maestra.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["jugada"] = function (ui) {
    const { jmAction } = ui;
    const exact = {}, patterns = [];

    patterns.push({ test: name => /^jm-/.test(name), run: async (name, el) => { await jmAction(name, el);
    } });
    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
