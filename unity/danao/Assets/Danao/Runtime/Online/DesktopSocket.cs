using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Danao.Online
{
    public sealed class DesktopSocket : IOnlineSocket
    {
        private readonly ConcurrentQueue<EventItem> _events = new ConcurrentQueue<EventItem>();
        private ClientWebSocket _socket;
        private CancellationTokenSource _cancel;
        private bool _disposed;

        private readonly struct EventItem
        {
            public readonly int Kind;
            public readonly string Text;
            public EventItem(int kind, string text) { Kind = kind; Text = text; }
        }

        public bool IsOpen => _socket != null && _socket.State == WebSocketState.Open;
        public event Action Opened;
        public event Action<string> Message;
        public event Action<string> Closed;
        public event Action<string> Error;

        public void Connect(string url)
        {
            if (_disposed) throw new ObjectDisposedException(nameof(DesktopSocket));
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != "ws" && uri.Scheme != "wss"))
                throw new ArgumentException("A ws:// or wss:// URL is required.", nameof(url));
            Close();
            _cancel = new CancellationTokenSource();
            _socket = new ClientWebSocket();
            var origin = new UriBuilder(uri) { Scheme = uri.Scheme == "wss" ? "https" : "http", Port = uri.IsDefaultPort ? -1 : uri.Port, Path = string.Empty, Query = string.Empty, Fragment = string.Empty }.Uri.GetLeftPart(UriPartial.Authority);
            try { _socket.Options.SetRequestHeader("Origin", origin); } catch { }
            _ = ConnectAsync(uri, _cancel.Token);
        }

        private async Task ConnectAsync(Uri uri, CancellationToken token)
        {
            try
            {
                await _socket.ConnectAsync(uri, token);
                _events.Enqueue(new EventItem(0, string.Empty));
                await ReceiveLoop(token);
            }
            catch (OperationCanceledException) { }
            catch (Exception e) { _events.Enqueue(new EventItem(3, e.Message)); }
        }

        private async Task ReceiveLoop(CancellationToken token)
        {
            var buffer = new byte[32768];
            var builder = new StringBuilder();
            while (!token.IsCancellationRequested && _socket != null && _socket.State == WebSocketState.Open)
            {
                builder.Clear();
                WebSocketReceiveResult result;
                do
                {
                    result = await _socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _events.Enqueue(new EventItem(2, result.CloseStatusDescription ?? "Connection closed."));
                        return;
                    }
                    if (result.MessageType != WebSocketMessageType.Text) continue;
                    builder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                    if (builder.Length > 65536) throw new WebSocketException("Incoming Danao message is too large.");
                } while (!result.EndOfMessage);
                if (builder.Length > 0) _events.Enqueue(new EventItem(1, builder.ToString()));
            }
        }

        public void Send(string text)
        {
            if (!IsOpen || string.IsNullOrEmpty(text)) return;
            var bytes = Encoding.UTF8.GetBytes(text);
            if (bytes.Length > 32768) { _events.Enqueue(new EventItem(3, "Outgoing Danao message is too large.")); return; }
            _ = SendAsync(bytes);
        }

        private async Task SendAsync(byte[] bytes)
        {
            try { await _socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cancel.Token); }
            catch (OperationCanceledException) { }
            catch (Exception e) { _events.Enqueue(new EventItem(3, e.Message)); }
        }

        public void Pump()
        {
            while (_events.TryDequeue(out var item))
            {
                switch (item.Kind)
                {
                    case 0: Opened?.Invoke(); break;
                    case 1: Message?.Invoke(item.Text); break;
                    case 2: Closed?.Invoke(item.Text); break;
                    default: Error?.Invoke(item.Text); break;
                }
            }
        }

        public void Close()
        {
            var socket = _socket;
            _socket = null;
            try { _cancel?.Cancel(); } catch { }
            try { if (socket != null && socket.State == WebSocketState.Open) _ = socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client closed", CancellationToken.None); } catch { }
            try { socket?.Dispose(); } catch { }
            try { _cancel?.Dispose(); } catch { }
            _cancel = null;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Close();
        }
    }
}
