import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { initials } from '../lib/format';
import type { Beneficiary } from '../lib/tasks';
import type { Member, Task } from '../types';

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
  const { user } = useAuth();
  const { members } = useHousehold();

  const assignees = task.assigneeIds
    .map((id) => members.find((m) => m.userId === id))
    .filter((m): m is Member => !!m);

  // אם המסמן הוא אחד האחראים - הוא יופיע ראשון עם התווית "לי"
  const ordered = [...assignees].sort((a, b) => {
    if (a.userId === user?.uid) return -1;
    if (b.userId === user?.uid) return 1;
    return 0;
  });

  return (
    <Modal title="למי לזקוף את הנקודות?" onClose={onClose}>
      <p className="member-sub" style={{ marginBottom: '0.8rem' }}>
        המשימה שויכה לכמה אחראים. בחר מי ביצע אותה ויקבל את הנקודות.
      </p>
      {ordered.map((m) => {
        const isMe = m.userId === user?.uid;
        return (
          <div
            className="card member-row"
            key={m.userId}
            onClick={() => onChoose({ id: m.userId, name: m.displayName })}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar">{initials(m.displayName)}</div>
            <div className="member-info">
              <div className="member-name">
                {isMe ? `לי (${m.displayName})` : m.displayName}
              </div>
              <div className="member-sub">{m.role}</div>
            </div>
            <span className="chip">⭐ {task.points ?? 0}</span>
          </div>
        );
      })}
    </Modal>
  );
}
