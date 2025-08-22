import { EmailListView } from "@/components/EmailListView";
import { Id } from "../../convex/_generated/dataModel";

interface SentViewProps {
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function SentView({ selectedEmailId, setSelectedEmailId }: SentViewProps) {
  return (
    <EmailListView
      title="Sent"
      filter="sent"
      selectedEmailId={selectedEmailId}
      setSelectedEmailId={setSelectedEmailId}
    />
  );
}