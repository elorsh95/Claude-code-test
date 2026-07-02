import { Modal } from './Modal';
import { useHousehold } from '../contexts/HouseholdContext';
import { initials } from '../lib/format';
import type { Beneficiary } from '../lib/tasks';
import type { Task } from '../types';

/** בחירת מי יקבל את נקודות המשימה (מבין האחראים) */
export function BeneficiaryModal({
  task,
  onClose,
  onChoose,
}: {
  task: Task;
  onClose: () => void;
  onChoose: (b: Beneficiary) => void;
}) {
  const { members } = useHousehold();
  const assignees = task.assigneeIds
    .map((id) => members.find((m) => m.userId === id))
    .filter(Boolean);

  return (
    <Modal title="למי לזקוף את הנקודות?" onClose={onClose}>
      <p className="member-sub" style={{ marginBottom: '0.8rem' }}>
        המשימה שויכה לכמה אחראים. בחר מי ביצע אותה ויקבל את הנקודות.
      </p>
      {assignees.map((m) => (
        <div
          className="card member-row"
          key={m!.userId}
          onClick={() =>
            onChoose({ id: m!.userId, name: m!.displayName })
          }
          style={{ cursor: 'pointer' }}
        >
          <div className="avatar">{initials(m!.displayName)}</div>
          <div className="member-info">
            <div className="member-name">{m!.displayName}</div>
            <div className="member-sub">{m!.role}</div>
          </div>
          <span className="chip">⭐ {task.points ?? 0}</span>
        </div>
      ))}
    </Modal>
  );
}
