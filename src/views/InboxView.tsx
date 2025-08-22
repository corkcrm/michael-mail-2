import { EmailListView } from "@/components/EmailListView";
import { Id } from "../../convex/_generated/dataModel";

interface InboxViewProps {
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function InboxView({ selectedEmailId, setSelectedEmailId }: InboxViewProps) {
  return (
    <EmailListView
      title="Inbox"
      filter="inbox"
      selectedEmailId={selectedEmailId}
      setSelectedEmailId={setSelectedEmailId}
    />
  );
}