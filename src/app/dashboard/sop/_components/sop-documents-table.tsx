import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { SOPService } from "@/lib/api/sop";
import { formatDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SOPDocumentStatus } from "@/lib/types/sop";

interface SOPDocumentsTableProps {
  status?: SOPDocumentStatus;
  departmentId?: string;
  categoryId?: string;
  query?: string;
  page: number;
  pageSize: number;
}

export function SOPDocumentsTable({
  status,
  departmentId,
  categoryId,
  query,
  page,
  pageSize,
}: SOPDocumentsTableProps) {
  const searchParams = useSearchParams();
  
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'sop-documents', 
      status, 
      departmentId, 
      categoryId, 
      query, 
      page, 
      pageSize
    ],
    queryFn: () => 
      SOPService.getDocuments({
        status,
        department_id: departmentId,
        category_id: categoryId,
        query,
        page,
        page_size: pageSize,
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
        <p>Error loading documents. Please try again later.</p>
      </div>
    );
  }

  const documents = data.data?.data || [];

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.fileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No documents found</h3>
        <p className="text-sm text-muted-foreground">
          No SOP documents match your current filters.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: SOPDocumentStatus) => {
    const statusMap = {
      draft: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        label: 'Draft'
      },
      under_review: {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: 'Under Review'
      },
      approved: {
        bg: 'bg-green-50',
        text: 'text-green-800',
        border: 'border-green-200',
        label: 'Approved'
      },
      obsolete: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        label: 'Obsolete'
      },
    };

    const statusInfo = statusMap[status] || statusMap.draft;
    
    return (
      <span 
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-blue-100 text-blue-600">
                      <Icons.fileText className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                      <div className="text-sm text-gray-500">{doc.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{doc.department?.name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.category?.name || 'No category'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(doc.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{formatDate(doc.updated_at)}</div>
                  <div className="text-xs text-gray-400">
                    v{doc.version}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/dashboard/sop/${doc.id}`}>
                    <Button variant="ghost" size="sm">
                      View <Icons.chevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', (page - 1).toString());
              window.location.search = params.toString();
            }}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            disabled={!data.data || page >= data.data.total_pages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', (page + 1).toString());
              window.location.search = params.toString();
            }}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              !data.data || page >= data.data.total_pages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * pageSize, data.data?.total || 0)}
              </span>{' '}
              of <span className="font-medium">{data.data?.total || 0}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (page - 1).toString());
                  window.location.search = params.toString();
                }}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                <Icons.chevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, data.data?.total_pages || 0) }).map((_, i) => {
                const pageNum = Math.max(1, Math.min(
                  (data.data?.total_pages || 0) - 4,
                  Math.max(1, page - 2)
                )) + i;
                
                if (pageNum > (data.data?.total_pages || 0)) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('page', pageNum.toString());
                      window.location.search = params.toString();
                    }}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === pageNum
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                disabled={!data.data || page >= data.data.total_pages}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (page + 1).toString());
                  window.location.search = params.toString();
                }}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  !data.data || page >= data.data.total_pages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                <Icons.chevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
