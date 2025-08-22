import { EmailListView } from "@/components/EmailListView";
import { Id } from "../../convex/_generated/dataModel";

interface DraftsViewProps {
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function DraftsView({ selectedEmailId, setSelectedEmailId }: DraftsViewProps) {
  return (
    <EmailListView
      title="Drafts"
      filter="drafts"
      selectedEmailId={selectedEmailId}
      setSelectedEmailId={setSelectedEmailId}
    />
  );
}