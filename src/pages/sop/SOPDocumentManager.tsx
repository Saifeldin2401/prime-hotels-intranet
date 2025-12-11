import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const mockDocuments = [
  {
    id: '1',
    title: 'Guest Check-in Procedure',
    description: 'Standard procedure for guest registration and check-in process',
    status: 'approved',
    version: '2.1',
    department: 'Front Desk',
    category: 'Operations',
    priority: 'high',
    emergencyProcedure: false,
    requiresTraining: true,
    complianceLevel: 'standard',
    reviewFrequency: 'quarterly',
    lastReviewed: new Date('2024-09-15'),
    nextReviewDue: new Date('2024-12-15'),
    createdBy: 'John Doe',
    createdAt: new Date('2024-01-10'),
    updatedBy: 'Jane Smith',
    updatedAt: new Date('2024-09-15'),
    approvers: ['Mike Johnson', 'Sarah Wilson'],
    tags: ['check-in', 'registration', 'guest-service'],
    versions: [
      { version: '1.0', date: new Date('2024-01-10'), author: 'John Doe', changes: 'Initial version' },
      { version: '1.1', date: new Date('2024-03-15'), author: 'Jane Smith', changes: 'Added VIP guest handling' },
      { version: '2.0', date: new Date('2024-06-20'), author: 'Mike Johnson', changes: 'Major restructuring' },
      { version: '2.1', date: new Date('2024-09-15'), author: 'Jane Smith', changes: 'Updated contactless check-in' }
    ],
    acknowledgments: 45,
    totalStaff: 50,
    trainingCompletion: 90
  },
  {
    id: '2',
    title: 'Emergency Fire Protocol',
    description: 'Comprehensive emergency response procedures for fire incidents',
    status: 'approved',
    version: '3.0',
    department: 'Safety',
    category: 'Emergency',
    priority: 'critical',
    emergencyProcedure: true,
    requiresTraining: true,
    complianceLevel: 'regulatory',
    reviewFrequency: 'semi-annually',
    lastReviewed: new Date('2024-06-20'),
    nextReviewDue: new Date('2024-12-20'),
    createdBy: 'Sarah Wilson',
    createdAt: new Date('2023-12-01'),
    updatedBy: 'Tom Brown',
    updatedAt: new Date('2024-06-20'),
    approvers: ['John Doe', 'Mike Johnson', 'Jane Smith'],
    tags: ['emergency', 'fire', 'safety', 'critical'],
    versions: [
      { version: '1.0', date: new Date('2023-12-01'), author: 'Sarah Wilson', changes: 'Initial emergency protocol' },
      { version: '2.0', date: new Date('2024-03-01'), author: 'Tom Brown', changes: 'Added evacuation routes' },
      { version: '3.0', date: new Date('2024-06-20'), author: 'Tom Brown', changes: 'Updated with new fire codes' }
    ],
    acknowledgments: 120,
    totalStaff: 120,
    trainingCompletion: 100
  },
  {
    id: '3',
    title: 'Housekeeping Room Cleaning Standards',
    description: 'Detailed cleaning procedures and quality standards for all room types',
    status: 'under_review',
    version: '3.0',
    department: 'Housekeeping',
    category: 'Operations',
    priority: 'medium',
    emergencyProcedure: false,
    requiresTraining: true,
    complianceLevel: 'enhanced',
    reviewFrequency: 'quarterly',
    lastReviewed: new Date('2024-09-25'),
    nextReviewDue: new Date('2024-12-25'),
    createdBy: 'Mike Johnson',
    createdAt: new Date('2024-02-15'),
    updatedBy: 'Lisa Anderson',
    updatedAt: new Date('2024-09-25'),
    approvers: ['John Doe'],
    tags: ['cleaning', 'housekeeping', 'quality', 'standards'],
    versions: [
      { version: '1.0', date: new Date('2024-02-15'), author: 'Mike Johnson', changes: 'Initial cleaning standards' },
      { version: '2.0', date: new Date('2024-05-10'), author: 'Lisa Anderson', changes: 'Added COVID protocols' },
      { version: '3.0', date: new Date('2024-09-25'), author: 'Lisa Anderson', changes: 'Updated eco-friendly practices' }
    ],
    acknowledgments: 28,
    totalStaff: 35,
    trainingCompletion: 80
  },
  {
    id: '4',
    title: 'Food Safety Guidelines',
    description: 'Food handling, storage, and preparation safety protocols',
    status: 'draft',
    version: '1.0',
    department: 'Food & Beverage',
    category: 'Safety',
    priority: 'high',
    emergencyProcedure: false,
    requiresTraining: true,
    complianceLevel: 'regulatory',
    reviewFrequency: 'annually',
    lastReviewed: null,
    nextReviewDue: new Date('2025-01-01'),
    createdBy: 'Tom Brown',
    createdAt: new Date('2024-11-01'),
    updatedBy: 'Tom Brown',
    updatedAt: new Date('2024-11-01'),
    approvers: [],
    tags: ['food-safety', 'handling', 'storage', 'preparation'],
    versions: [
      { version: '1.0', date: new Date('2024-11-01'), author: 'Tom Brown', changes: 'Initial draft' }
    ],
    acknowledgments: 0,
    totalStaff: 25,
    trainingCompletion: 0
  }
]

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  obsolete: 'bg-red-100 text-red-800'
}

const priorityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-purple-100 text-purple-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const complianceColors: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-800',
  enhanced: 'bg-blue-100 text-blue-800',
  critical: 'bg-orange-100 text-orange-800',
  regulatory: 'bg-red-100 text-red-800'
}

export function SOPDocumentManager() {
  const [documents, setDocuments] = useState(mockDocuments)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
    const matchesDepartment = filterDepartment === 'all' || doc.department === filterDepartment
    const matchesPriority = filterPriority === 'all' || doc.priority === filterPriority
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesStatus && matchesDepartment && matchesPriority && matchesSearch
  })

  const handleApprove = (documentId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, status: 'approved', updatedAt: new Date() }
        : doc
    ))
    setShowApprovalDialog(false)
  }

  const handleReject = (documentId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, status: 'draft', updatedAt: new Date() }
        : doc
    ))
    setShowApprovalDialog(false)
  }

  const DocumentActions = ({ document: _document }: { document: any }) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm">
        <Icons.Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Icons.Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(true)}>
        <Icons.History className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Icons.Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Icons.Printer className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Icons.MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOP Document Manager</h1>
          <p className="text-muted-foreground">
            Comprehensive document management with version control and approval workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Icons.Upload className="h-4 w-4 mr-2" />
            Import Documents
          </Button>
          <Button>
            <Icons.FilePlus className="h-4 w-4 mr-2" />
            Create SOP
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="obsolete">Obsolete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Front Desk">Front Desk</SelectItem>
                <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocuments.length})</CardTitle> 
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-muted-foreground">{doc.description}</div>
                      <div className="flex gap-1 mt-1">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[doc.status]}>
                      {doc.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.department}</TableCell>
                  <TableCell>
                    <Badge className={priorityColors[doc.priority]}>
                      {doc.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{doc.version}</TableCell>
                  <TableCell>
                    <Badge className={complianceColors[doc.complianceLevel]}>
                      {doc.complianceLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{doc.trainingCompletion}%</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${doc.trainingCompletion}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{formatDate(doc.updatedAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(doc.updatedAt)} ago
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DocumentActions document={doc} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Track changes and updates to this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              {mockDocuments[0]?.versions.map((version: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{version.version}</Badge>
                      <span className="font-medium">{version.author}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {version.changes}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(version.date)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Icons.Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Review and approve or reject this SOP document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add your comments about this document..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Required Actions</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span>Request additional information</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span>Schedule follow-up meeting</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span>Assign to another reviewer</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleReject(mockDocuments[0].id)}>
              Reject
            </Button>
            <Button onClick={() => handleApprove(mockDocuments[0].id)}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
