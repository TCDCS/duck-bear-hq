using System;
using UnityEngine;

namespace Danao.Online
{
    [Serializable] public sealed class RoomPlayerDto { public int id; public string name; public string character; public string costume; public bool ready; public bool connected; }
    [Serializable] public sealed class RoomSettingsDto { public string mode; public string arena; public bool healthDamage = true; public bool visibleBruising = true; public bool arenaHazards = true; public bool friendlyFire; }
    [Serializable] public sealed class MatchResultDto { public int winner = -1; public int winnerTeam = -1; public bool interrupted; public string reason; }
    [Serializable] public sealed class RoomDto
    {
        public int version;
        public string code;
        public string phase;
        public bool locked;
        public int hostId;
        public int matchId;
        public RoomSettingsDto settings;
        public RoomPlayerDto[] players;
        public MatchResultDto result;
        public double expiresAt;
    }
    [Serializable] public sealed class RoomJoinResponse { public RoomDto room; public int id; public string token; }
    [Serializable] public sealed class ErrorResponse { public string error; }
    [Serializable] public sealed class SessionResponse { public bool signedIn; }

    [Serializable] public sealed class CreateRoomRequest
    {
        public string name;
        public string character;
        public string costume;
        public CreateRoomRequest(string playerName, string characterName, string costumeName) { name=playerName; character=characterName; costume=costumeName; }
    }
    [Serializable] public sealed class JoinRoomRequest
    {
        public string code;
        public string name;
        public string character;
        public string costume;
        public JoinRoomRequest(string roomCode, string playerName, string characterName, string costumeName) { code=roomCode; name=playerName; character=characterName; costume=costumeName; }
    }
    [Serializable] public sealed class InputFrameDto
    {
        public int seq;
        public float moveX;
        public float moveY;
        public bool jump;
        public bool punch;
        public bool grab;
        public bool dodge;
        public bool fire;
        public bool block;
    }
    [Serializable] public sealed class InputCommandDto
    {
        public string type="input";
        public int seq;
        public float moveX;
        public float moveY;
        public bool jump;
        public bool punch;
        public bool grab;
        public bool dodge;
        public bool fire;
        public bool block;
        public static InputCommandDto From(InputFrameDto f) => new InputCommandDto{seq=f.seq,moveX=f.moveX,moveY=f.moveY,jump=f.jump,punch=f.punch,grab=f.grab,dodge=f.dodge,fire=f.fire,block=f.block};
    }
    [Serializable] public sealed class SetupCommandDto
    {
        public string type="setup";
        public string mode;
        public string arena;
        public bool healthDamage;
        public bool visibleBruising;
        public bool arenaHazards;
        public bool friendlyFire;
    }
    [Serializable] public sealed class ChoiceCommandDto { public string type="choice"; public string character; public string costume; }
    [Serializable] public sealed class StateCommandDto { public string type="state"; public NetworkSnapshot state; }
    [Serializable] public sealed class ResultCommandDto { public string type="result"; public MatchResultDto result; }

    [Serializable] public sealed class SocketMessage
    {
        public string type;
        public int id;
        public int hostId;
        public string message;
        public bool ready;
        public bool locked;
        public string character;
        public string costume;
        public string mode;
        public string arena;
        public bool healthDamage;
        public bool visibleBruising;
        public bool arenaHazards;
        public bool friendlyFire;
        public RoomDto room;
        public InputFrameDto frame;
        public NetworkSnapshot state;
        public MatchResultDto result;
    }

    public static class OnlineProtocol
    {
        public static string Json(object value) => JsonUtility.ToJson(value);
        public static T Parse<T>(string json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try { return JsonUtility.FromJson<T>(json); }
            catch { return null; }
        }
        public static SocketMessage Command(string type) => new SocketMessage { type=type };
    }
}
