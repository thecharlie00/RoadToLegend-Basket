'use strict';
self.onmessage = function (event) {
  const response = self.CAA.WorkerHandler.handle(event.data);
  self.postMessage(response);
};
