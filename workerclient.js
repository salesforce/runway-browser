'use strict';

class WorkerClient {
  constructor() {
    this._worker = new Worker('worker-bundle.js');
    this._nextRequestId = 1;
    this._worker.onmessage = e => this._onMessage(e);
    this._requests = new Map();
  }

  _onMessage(e) {
    let reply = e.data;
    this._requests.get(reply.id).resolve(reply.payload);
    this._requests.delete(reply.id);
  }

  _request(type, payload) {
    let request = {
      type: type,
      id: this._nextRequestId,
      payload: payload,
    };
    this._nextRequestId += 1;
    this._worker.postMessage(request);
    let promise = new Promise((resolve, reject) => {
      this._requests.set(request.id, {resolve: resolve, reject: reject});
    });
    return promise;
  }

  load(preludeText, input) {
    return this._request('load', {
      preludeText: preludeText,
      input: {
        filename: input.filename,
        text: input.getText(),
      },
    });
  }

  simulate() {
    return this._request('simulate');
  }

  reset(event) {
    return this._request('reset', event);
  }
}

module.exports = WorkerClient;
