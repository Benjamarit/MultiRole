import JudgeUserPicker from './JudgeUserPicker';

export default function JudgeAssignModal({ isOpen, ...props }) {
  return isOpen ? <JudgeUserPicker {...props} /> : null;
}
