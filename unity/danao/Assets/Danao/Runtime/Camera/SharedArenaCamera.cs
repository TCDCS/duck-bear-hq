using System.Collections.Generic;
using Danao.Fighters;
using UnityEngine;

namespace Danao.CameraSystem
{
    public sealed class SharedArenaCamera : MonoBehaviour
    {
        private readonly List<FighterController> _targets = new List<FighterController>();
        private Camera _camera;

        public void Configure(IEnumerable<FighterController> fighters)
        {
            _targets.Clear();
            _targets.AddRange(fighters);
            _camera = GetComponent<Camera>();
            if (_camera == null) _camera = gameObject.AddComponent<Camera>();
            _camera.fieldOfView = 48f;
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = new Color(.07f,.055f,.12f);
        }

        private void LateUpdate()
        {
            if (_targets.Count == 0) return;
            var centre = Vector3.zero;
            var alive = 0;
            foreach (var f in _targets)
            {
                if (f == null) continue;
                centre += f.transform.position;
                alive++;
            }
            if (alive == 0) return;
            centre /= alive;

            var spread = 0f;
            foreach (var f in _targets)
            {
                if (f == null) continue;
                spread = Mathf.Max(spread, Vector3.Distance(new Vector3(f.transform.position.x,0,f.transform.position.z), new Vector3(centre.x,0,centre.z)));
            }

            var distance = Mathf.Clamp(15f + spread * 1.25f, 16f, 28f);
            var desired = centre + new Vector3(0f, distance * .72f, -distance);
            transform.position = Vector3.Lerp(transform.position, desired, 1f - Mathf.Exp(-4f * Time.deltaTime));
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation((centre + Vector3.up * .8f) - transform.position), 1f - Mathf.Exp(-5f * Time.deltaTime));
        }
    }
}
