import { Check } from 'lucide-react';

interface Props {
  catalog: Record<string, string[]>;
  selected: Set<string>;
  /** Permissions that are baked in by an inherited role. Always shown ticked + disabled. */
  inherited?: Set<string>;
  onToggle: (perm: string) => void;
  disabled?: boolean;
}

const RESOURCE_LABELS: Record<string, string> = {
  companies: 'Companies',
  users: 'Users',
  jobs_moderation: 'Jobs (moderation)',
  job_categories: 'Job categories',
  skill_tags: 'Skill tags',
  tickets: 'Support tickets',
  analytics: 'Analytics',
  audit_logs: 'Audit logs',
  system_config: 'System config',
  admins: 'Admin accounts',
  roles: 'Roles',
  seekers: 'Seekers directory',
  ai_features: 'AI features',
  officials: 'Employment officials',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  suspend: 'Suspend',
  ban: 'Ban',
  remove: 'Remove',
  merge: 'Merge',
  assign: 'Assign',
  reply: 'Reply',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
  resend_welcome: 'Resend welcome',
};

export default function PermissionMatrix({
  catalog,
  selected,
  inherited,
  onToggle,
  disabled = false,
}: Props) {
  const inheritedSet = inherited ?? new Set<string>();

  const toggleAllInResource = (resource: string, actions: string[]) => {
    const allKeys = actions.map((a) => `${resource}:${a}`);
    const allOn = allKeys.every((k) => selected.has(k) || inheritedSet.has(k));
    for (const k of allKeys) {
      if (inheritedSet.has(k)) continue;
      const isOn = selected.has(k);
      if (allOn ? isOn : !isOn) onToggle(k);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Resource</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Permissions</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600 w-24">All</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(catalog).map(([resource, actions]) => {
              const allKeys = actions.map((a) => `${resource}:${a}`);
              const grantedCount = allKeys.filter(
                (k) => selected.has(k) || inheritedSet.has(k)
              ).length;
              const allOn = grantedCount === allKeys.length;
              return (
                <tr key={resource} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-gray-900 whitespace-nowrap">
                    {RESOURCE_LABELS[resource] ?? resource}
                    <p className="text-xs text-gray-400 font-normal mt-0.5">{resource}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => {
                        const key = `${resource}:${action}`;
                        const isInherited = inheritedSet.has(key);
                        const isSelected = isInherited || selected.has(key);
                        const isDisabled = disabled || isInherited;
                        return (
                          <button
                            type="button"
                            key={action}
                            onClick={() => !isDisabled && onToggle(key)}
                            disabled={isDisabled}
                            title={isInherited ? 'Granted by role' : undefined}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isSelected
                                ? isInherited
                                  ? 'bg-orange-50 text-orange-700 border-orange-200 cursor-default'
                                  : 'bg-orange-100 text-orange-700 border-orange-300'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            } ${isDisabled && !isInherited ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {ACTION_LABELS[action] ?? action}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => !disabled && toggleAllInResource(resource, actions)}
                      disabled={disabled}
                      className="text-xs font-semibold text-orange-600 hover:underline disabled:opacity-50"
                    >
                      {allOn ? 'Clear' : 'All'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {grantedCount}/{allKeys.length}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
