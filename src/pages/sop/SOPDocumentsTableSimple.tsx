import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

const mockDocuments = [
  {
    id: "1",
    title: "Guest Check-in Procedure",
    description: "Standard procedure for guest registration and check-in process",
    status: "approved" as const,
    department: "Front Desk",
    category: "Operations",
    version: "2.1",
    updated_at: new Date().toISOString(),
    created_by: "John Doe"
  },
  {
    id: "2", 
    title: "Housekeeping Room Cleaning Standards",
    description: "Detailed cleaning procedures for all room types",
    status: "draft" as const,
    department: "Housekeeping",
    category: "Operations",
    version: "1.0",
    updated_at: new Date().toISOString(),
    created_by: "Jane Smith"
  },
  {
    id: "3",
    title: "Emergency Response Protocol",
    description: "Procedures for handling various emergency situations",
    status: "under_review" as const,
    department: "Safety",
    category: "Safety",
    version: "3.0", 
    updated_at: new Date().toISOString(),
    created_by: "Mike Johnson"
  }
]

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  obsolete: "bg-red-100 text-red-800"
}

const statusLabels = {
  draft: "Draft",
  under_review: "Under Review", 
  approved: "Approved",
  obsolete: "Obsolete"
}

export function SOPDocumentsTable() {
  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Title
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Status
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Department
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Category
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Version
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Updated
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockDocuments.map((doc) => (
              <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4">
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-muted-foreground">{doc.description}</div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={statusColors[doc.status]}>
                    {statusLabels[doc.status]}
                  </Badge>
                </td>
                <td className="p-4 text-sm">{doc.department}</td>
                <td className="p-4 text-sm">{doc.category}</td>
                <td className="p-4 text-sm font-mono">{doc.version}</td>
                <td className="p-4 text-sm">
                  {formatDate(new Date(doc.updated_at))}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Icons.Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Icons.Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Icons.MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-4">
        <div className="text-sm text-muted-foreground">
          Showing {mockDocuments.length} of {mockDocuments.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
