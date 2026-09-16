using System;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;

namespace Danao.Online
{
    public sealed class WebGlSocket : MonoBehaviour, IOnlineSocket
    {
        private static int _nextId = 1;
        private int _id;
        private bool _open;
        private bool _disposed;

        public bool IsOpen => _open;
        public event Action Opened;
        public event Action<string> Message;
        public event Action<string> Closed;
        public event Action<string> Error;

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void DanaoSocket_Open(int id, string url, string gameObjectName);
        [DllImport("__Internal")] private static extern int DanaoSocket_Send(int id, string text);
        [DllImport("__Internal")] private static extern void DanaoSocket_Close(int id);
#endif

        public void Connect(string url)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(WebGlSocket));
            if (string.IsNullOrWhiteSpace(url)) throw new ArgumentException("A WebSocket URL is required.", nameof(url));
            Close();
            _id = _nextId++;
#if UNITY_WEBGL && !UNITY_EDITOR
            DanaoSocket_Open(_id, url, gameObject.name);
#else
            Error?.Invoke("WebGL WebSocket transport is only available in a Web build.");
#endif
        }

        public void Send(string text)
        {
            if (!_open || string.IsNullOrEmpty(text)) return;
#if UNITY_WEBGL && !UNITY_EDITOR
            if (DanaoSocket_Send(_id, text) == 0) Error?.Invoke("The WebSocket is not open.");
#else
            Error?.Invoke("WebGL WebSocket transport is not active.");
#endif
        }

        public void Close()
        {
            if (_id == 0) return;
#if UNITY_WEBGL && !UNITY_EDITOR
            DanaoSocket_Close(_id);
#endif
            _open = false;
            _id = 0;
        }

        public void Pump() { }

        public void OnDanaoSocketEvent(string payload)
        {
            if (string.IsNullOrEmpty(payload) || _id == 0) return;
            var first = payload.IndexOf('|');
            var second = first < 0 ? -1 : payload.IndexOf('|', first + 1);
            if (first <= 0 || second < 0) return;
            if (!int.TryParse(payload.Substring(0, first), out var id) || id != _id) return;
            var kind = payload.Substring(first + 1, second - first - 1);
            var encoded = payload.Substring(second + 1);
            string value;
            try { value = encoded.Length == 0 ? string.Empty : Encoding.UTF8.GetString(Convert.FromBase64String(encoded)); }
            catch { value = string.Empty; }
            switch (kind)
            {
                case "open": _open = true; Opened?.Invoke(); break;
                case "message": Message?.Invoke(value); break;
                case "error": Error?.Invoke(string.IsNullOrEmpty(value) ? "WebSocket error." : value); break;
                case "close": _open = false; Closed?.Invoke(value); break;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Close();
        }

        private void OnDestroy() => Dispose();
    }
}
