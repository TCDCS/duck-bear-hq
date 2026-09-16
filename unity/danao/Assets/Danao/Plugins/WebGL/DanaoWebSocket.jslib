mergeInto(LibraryManager.library, {
  DanaoSocket_Open: function(id, urlPtr, gameObjectPtr) {
    var url = UTF8ToString(urlPtr);
    var gameObject = UTF8ToString(gameObjectPtr);
    if (!globalThis.__danaoSockets) globalThis.__danaoSockets = {};
    var sendEvent = function(kind, value) {
      var text = value || '';
      var bytes = new TextEncoder().encode(text);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      SendMessage(gameObject, 'OnDanaoSocketEvent', id + '|' + kind + '|' + btoa(binary));
    };
    try {
      var socket = new WebSocket(url);
      globalThis.__danaoSockets[id] = socket;
      socket.onopen = function() { sendEvent('open', ''); };
      socket.onmessage = function(evt) { sendEvent('message', String(evt.data)); };
      socket.onerror = function() { sendEvent('error', 'WebSocket error'); };
      socket.onclose = function(evt) {
        sendEvent('close', (evt.code || 1000) + ':' + (evt.reason || 'Connection closed'));
        delete globalThis.__danaoSockets[id];
      };
    } catch (e) {
      sendEvent('error', String(e && e.message ? e.message : e));
    }
  },
  DanaoSocket_Send: function(id, textPtr) {
    var sockets = globalThis.__danaoSockets || {};
    var socket = sockets[id];
    if (!socket || socket.readyState !== WebSocket.OPEN) return 0;
    socket.send(UTF8ToString(textPtr));
    return 1;
  },
  DanaoSocket_Close: function(id) {
    var sockets = globalThis.__danaoSockets || {};
    var socket = sockets[id];
    if (!socket) return;
    try { socket.close(1000, 'Client closed'); } catch (_) {}
    delete sockets[id];
  }
});
