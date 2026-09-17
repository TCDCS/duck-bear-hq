using System;

namespace Danao.Online
{
    public interface IOnlineSocket : IDisposable
    {
        bool IsOpen { get; }
        event Action Opened;
        event Action<string> Message;
        event Action<string> Closed;
        event Action<string> Error;
        void Connect(string url);
        void Send(string text);
        void Close();
        void Pump();
    }
}
