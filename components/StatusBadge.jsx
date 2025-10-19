// components/StatusBadge.jsx
import { getStatusBadge } from "../utils/statusBadge";

export default function StatusBadge({ value, className = "" }) {
  return (
    <span className={`${getStatusBadge(value)} ${className}`.trim()}>
      {value || "-"}
    </span>
  );
}
