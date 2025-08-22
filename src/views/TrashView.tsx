import { EmailListView } from "@/components/EmailListView";
import { Id } from "../../convex/_generated/dataModel";

interface TrashViewProps {
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function TrashView({ selectedEmailId, setSelectedEmailId }: TrashViewProps) {
  return (
    <EmailListView
      title="Trash"
      filter="trash"
      selectedEmailId={selectedEmailId}
      setSelectedEmailId={setSelectedEmailId}
    />
  );
}