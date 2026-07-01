import {
  PERMISSION_LABELS,
  PERMISSION_ORDER,
  PRESETS,
} from '../lib/permissions';
import type { PermissionKey, Permissions } from '../types';

interface Props {
  role: string;
  position: string;
  permissions: Permissions;
  onRoleChange: (v: string) => void;
  onPositionChange: (v: string) => void;
  onPermissionsChange: (p: Permissions) => void;
  disabled?: boolean;
}

export function PermissionsEditor({
  role,
  position,
  permissions,
  onRoleChange,
  onPositionChange,
  onPermissionsChange,
  disabled,
}: Props) {
  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onRoleChange(preset.role);
    onPositionChange(preset.position);
    onPermissionsChange({ ...preset.permissions });
  }

  function togglePerm(key: PermissionKey) {
    onPermissionsChange({ ...permissions, [key]: !permissions[key] });
  }

  return (
    <>
      <div className="field">
        <label>תבנית מהירה</label>
        <select
          disabled={disabled}
          defaultValue=""
          onChange={(e) => e.target.value && applyPreset(e.target.value)}
        >
          <option value="">בחר תבנית (ואפשר להתאים ידנית)…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="role">תפקיד</label>
        <input
          id="role"
          type="text"
          value={role}
          disabled={disabled}
          onChange={(e) => onRoleChange(e.target.value)}
          placeholder="למשל: אמא, אבא, ילד"
        />
      </div>

      <div className="field">
        <label htmlFor="position">מעמד</label>
        <input
          id="position"
          type="text"
          value={position}
          disabled={disabled}
          onChange={(e) => onPositionChange(e.target.value)}
          placeholder="למשל: בוגר, נוער"
        />
      </div>

      <div className="field">
        <label>הרשאות</label>
        <div className="perm-list">
          {PERMISSION_ORDER.map((key) => (
            <div className="perm-row" key={key}>
              <div>
                <div className="perm-label">{PERMISSION_LABELS[key].label}</div>
                <div className="member-sub">{PERMISSION_LABELS[key].hint}</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={permissions[key]}
                  disabled={disabled}
                  onChange={() => togglePerm(key)}
                />
                <span className="slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
