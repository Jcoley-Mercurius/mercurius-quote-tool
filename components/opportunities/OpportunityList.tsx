import type { OpportunityListItem as OpportunityListItemData } from "@/lib/opportunities/types";
import { OpportunityListItem } from "./OpportunityListItem";

export function OpportunityList({
  items,
  assignmentLabels,
}: {
  items: OpportunityListItemData[];
  assignmentLabels: Map<string, string>;
}) {
  return (
    <div className="space-y-3" aria-label="Opportunity results">
      {items.map((item) => (
        <OpportunityListItem
          key={item.id}
          item={item}
          assignmentLabel={
            item.assignedUserId
              ? assignmentLabels.get(item.assignedUserId) || "Assigned team member"
              : "Unassigned"
          }
        />
      ))}
    </div>
  );
}
