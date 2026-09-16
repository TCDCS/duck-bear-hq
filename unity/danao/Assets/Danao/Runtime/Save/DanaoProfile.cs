using System;
using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Save
{
    [Serializable] public sealed class DanaoProfileSettings
    {
        public bool healthDamage=true;
        public bool visibleBruising=true;
        public bool arenaHazards=true;
        public float masterVolume=1f;
        public float musicVolume=.8f;
        public float sfxVolume=1f;
        public float screenShake=1f;
        public bool reducedMotion;
        public bool vibration=true;
    }

    [Serializable] public sealed class DanaoStats { public int matches; public int wins; public int knockouts; }

    [Serializable] public sealed class DanaoProfile
    {
        public int version=1;
        public DanaoProfileSettings settings=new DanaoProfileSettings();
        public string[] unlockedCostumes={"Arcade"};
        public string[] unlockedArenas={"WrestlingArena"};
        public string selectedCharacter="Hero";
        public string selectedCostume="Arcade";
        public string preferredMode="FreeForAll";
        public string preferredArena="WrestlingArena";
        public DanaoStats stats=new DanaoStats();

        public static DanaoProfile Default() => new DanaoProfile();

        public DanaoProfile Clone()
        {
            var json=JsonUtility.ToJson(this);
            return JsonUtility.FromJson<DanaoProfile>(json)??Default();
        }

        public void Normalise()
        {
            version=1;settings=settings??new DanaoProfileSettings();stats=stats??new DanaoStats();
            settings.masterVolume=Mathf.Clamp01(settings.masterVolume);settings.musicVolume=Mathf.Clamp01(settings.musicVolume);settings.sfxVolume=Mathf.Clamp01(settings.sfxVolume);settings.screenShake=Mathf.Clamp01(settings.screenShake);
            stats.matches=Mathf.Clamp(stats.matches,0,1000000000);stats.wins=Mathf.Clamp(stats.wins,0,1000000000);stats.knockouts=Mathf.Clamp(stats.knockouts,0,1000000000);
            unlockedCostumes=UniqueAllowed(unlockedCostumes,CostumeNames(),"Arcade");
            unlockedArenas=UniqueAllowed(unlockedArenas,ArenaNames(),"WrestlingArena");
            if(!Enum.TryParse(selectedCharacter,true,out CharacterId _))selectedCharacter="Hero";
            if(!Contains(unlockedCostumes,selectedCostume))selectedCostume="Arcade";
            if(!Enum.TryParse(preferredMode,true,out LocalMode _))preferredMode="FreeForAll";
            if(!Contains(unlockedArenas,preferredArena))preferredArena="WrestlingArena";
        }

        public MatchSettings ToMatchSettings(int players)
        {
            return new MatchSettings{ActivePlayers=Mathf.Clamp(players,1,4),HealthDamage=settings.healthDamage,VisibleBruising=settings.visibleBruising,ArenaHazards=settings.arenaHazards};
        }

        public static DanaoProfile Merge(DanaoProfile local,DanaoProfile cloud)
        {
            local=(local??Default()).Clone();cloud=(cloud??Default()).Clone();local.Normalise();cloud.Normalise();
            local.unlockedCostumes=Union(local.unlockedCostumes,cloud.unlockedCostumes);
            local.unlockedArenas=Union(local.unlockedArenas,cloud.unlockedArenas);
            local.stats.matches=Mathf.Max(local.stats.matches,cloud.stats.matches);
            local.stats.wins=Mathf.Max(local.stats.wins,cloud.stats.wins);
            local.stats.knockouts=Mathf.Max(local.stats.knockouts,cloud.stats.knockouts);
            local.Normalise();return local;
        }

        private static string[] CostumeNames(){var list=new string[CharacterCatalog.Costumes.Count];for(var i=0;i<list.Length;i++)list[i]=CharacterCatalog.Costumes[i].Id.ToString();return list;}
        private static string[] ArenaNames(){var list=new string[ArenaCatalog.All.Count];for(var i=0;i<list.Length;i++)list[i]=ArenaCatalog.All[i].Id.ToString();return list;}
        private static bool Contains(string[] values,string value){if(values==null)return false;for(var i=0;i<values.Length;i++)if(values[i]==value)return true;return false;}
        private static string[] UniqueAllowed(string[] values,string[] allowed,string fallback)
        {
            var set=new HashSet<string>(StringComparer.Ordinal);var permitted=new HashSet<string>(allowed,StringComparer.Ordinal);if(values!=null)for(var i=0;i<values.Length;i++)if(permitted.Contains(values[i]))set.Add(values[i]);set.Add(fallback);var result=new string[set.Count];set.CopyTo(result);Array.Sort(result,StringComparer.Ordinal);return result;
        }
        private static string[] Union(string[] a,string[] b){var set=new HashSet<string>(StringComparer.Ordinal);if(a!=null)foreach(var v in a)set.Add(v);if(b!=null)foreach(var v in b)set.Add(v);var r=new string[set.Count];set.CopyTo(r);Array.Sort(r,StringComparer.Ordinal);return r;}
    }
}
