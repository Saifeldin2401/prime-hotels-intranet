import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

interface Document {
  id: string
  title: string
  description: string
  status: string
  version: string
  department: string
  category: string
  priority: string
  emergencyProcedure: boolean
  requiresTraining: boolean
  complianceLevel: string
  reviewFrequency: string
  lastReviewed: Date | null
  nextReviewDue: Date | null
  createdBy: string
  createdAt: Date | null
  updatedBy: string
  updatedAt: Date | null
  approvers: string[]
  tags: string[]
  versions: Array<{
    version: string
    date: Date | null
    author: string
    changes: string
  }>
  acknowledgments: number
  totalStaff: number
  trainingCompletion: number
}

// Mock data removed in favor of Supabase fetching

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
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

export function SOPDocumentManager({ onEdit }: { onEdit?: (doc: Document) => void }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch Documents and Departments
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch Departments
        const { data: depts } = await supabase.from('departments').select('id, name').eq('is_active', true)
        if (depts) setDepartments(depts)

        // Fetch SOP Documents
        const { data: docs, error } = await supabase
          .from('sop_documents')
          .select(`
            id, title, description, status, version, priority, requires_quiz, compliance_level, review_frequency_months,
            created_at, updated_at, next_review_date,
            departments (name),
            author:profiles!sop_documents_created_by_fkey (full_name) 
          `) // profiles might need to be joined via created_by or similar if relation exists
          .order('updated_at', { ascending: false })

        if (error) throw error

        if (docs) {
          const mappedDocs: Document[] = docs.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description || '',
            status: d.status,
            version: d.version.toString(),
            department: d.departments?.name || 'Unknown',
            category: 'Operations', // Placeholder
            priority: d.priority || 'medium',
            emergencyProcedure: false, // Placeholder
            requiresTraining: d.requires_quiz || false,
            complianceLevel: d.compliance_level || 'standard',
            reviewFrequency: d.review_frequency_months ? `${d.review_frequency_months} months` : 'quarterly',
            lastReviewed: null,
            nextReviewDue: d.next_review_date ? new Date(d.next_review_date) : null,
            createdBy: d.author?.full_name || 'Unknown',
            createdAt: d.created_at ? new Date(d.created_at) : null,
            updatedBy: 'Unknown',
            updatedAt: d.updated_at ? new Date(d.updated_at) : null,
            approvers: [],
            tags: [],
            versions: [],
            acknowledgments: 0,
            totalStaff: 0,
            trainingCompletion: 0
          }))
          setDocuments(mappedDocs)
        }
      } catch (err) {
        console.error('Failed to fetch SOP data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

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

  const DocumentActions = ({ doc }: { doc: Document }) => (
    <div className="flex items-center gap-2">
      <Button size="sm" className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors" onClick={() => window.location.href = `/sop/${doc.id}`}>
        <Icons.Eye className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors" onClick={() => onEdit?.(doc)}>
        <Icons.Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => {
        setSelectedDocument(doc)
        setShowVersionHistory(true)
      }}>
        <Icons.History className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
        <Icons.Download className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
        <Icons.Printer className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => {
        setSelectedDocument(doc)
        setShowApprovalDialog(true)
      }}>
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
          <p className="text-gray-600">
            Comprehensive document management with version control and approval workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            <Icons.Upload className="h-4 w-4 mr-2" />
            Import Documents
          </Button>
          <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors">
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
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="obsolete">Obsolete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                ))}
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
                      <div className="text-sm text-gray-600">{doc.description}</div>
                      <div className="flex gap-1 mt-1">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} className="bg-hotel-navy text-white border border-hotel-navy rounded-md text-xs">
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
                      <div className="text-xs text-gray-600">
                        {doc.updatedAt ? `${formatDistanceToNow(doc.updatedAt)} ago` : 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DocumentActions doc={doc} />
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
            {selectedDocument?.versions?.length ? (
              selectedDocument.versions.map((version: Document['versions'][0], index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-hotel-navy text-white border border-hotel-navy rounded-md">v{version.version}</Badge>
                      <span className="font-medium">{version.author}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {version.changes}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formatDate(version.date)}
                    </div>
                  </div>
                  <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors">
                    <Icons.Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">No version history available</div>
            )}
          </div>
          <DialogFooter>
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setShowVersionHistory(false)}>
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
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-red-500 text-white hover:bg-red-600 rounded-md transition-colors" onClick={() => selectedDocument && handleReject(selectedDocument.id)}>
              Reject
            </Button>
            <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors" onClick={() => selectedDocument && handleApprove(selectedDocument.id)}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
