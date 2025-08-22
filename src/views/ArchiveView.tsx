import { EmailListView } from "@/components/EmailListView";
import { Id } from "../../convex/_generated/dataModel";

interface ArchiveViewProps {
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function ArchiveView({ selectedEmailId, setSelectedEmailId }: ArchiveViewProps) {
  return (
    <EmailListView
      title="Archive"
      filter="archive"
      selectedEmailId={selectedEmailId}
      setSelectedEmailId={setSelectedEmailId}
    />
  );
}