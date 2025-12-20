import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { UserForm } from '@/components/admin/UserForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Users, Loader2, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import type { Profile } from '@/lib/types'

import { useTranslation } from 'react-i18next'

export default function UserManagement() {
  const { t } = useTranslation('users')
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Profile[]
    },
  })

  // Delete/Deactivate Logic
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by deactivating
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      refetch()
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
    }
  })

  // Since I cannot easily import useMutation if not already imported at top level standardly (it is imported as parts of @tanstack/react-query usually),
  // I should check imports. Lines 1-2 show: import { useQuery } from '@tanstack/react-query'. I need to add useMutation there.
  // I will do that in a separate chunk or just update the existing import.


  const filteredUsers = users?.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (user: Profile) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedUser(null)
    refetch()
  }

  if (showForm) {
    return (
      <UserForm user={selectedUser || undefined} onClose={handleCloseForm} />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="bg-hotel-gold text-white px-4 py-2.5 rounded-md text-sm hover:bg-hotel-gold-dark transition-colors flex items-center gap-2 min-h-touch w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            {t('add_user')}
          </button>
        }
      />

      <div className="prime-card">
        <div className="prime-card-header">
          <h3 className="text-lg font-semibold">{t('directory')}</h3>
        </div>
        <div className="prime-card-body">
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hotel-navy focus:border-hotel-navy"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-3 sm:gap-4 min-h-touch active:bg-gray-100"
                  onClick={() => handleEdit(user)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-hotel-gold/20 flex items-center justify-center border border-hotel-gold/40 flex-shrink-0">
                      <span className="text-hotel-gold font-medium">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name || t('no_name')}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.properties && user.properties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.properties.map(p => (
                            <Badge key={p.id} variant="outline" className="text-[10px] px-1 py-0 h-4 border-gray-300 text-gray-500">
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto pl-13 sm:pl-0">
                    <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-xs">
                      {user.is_active ? t('status.active') : t('status.inactive')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-hotel-gold hover:bg-gold-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(user)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUserToDelete(user)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={t('empty.title')}
              description={searchTerm ? t('empty.no_results') : t('empty.description')}
              action={{
                label: t('add_user'),
                onClick: () => setShowForm(true),
                icon: Plus
              }}
            />
          )}
        </div>
      </div>

      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={async () => {
          if (userToDelete) {
            const { error } = await supabase
              .from('profiles')
              .update({ is_active: false })
              .eq('id', userToDelete.id)

            if (!error) {
              refetch()
              setDeleteConfirmOpen(false)
              setUserToDelete(null)
            }
          }
        }}
        itemName={userToDelete?.full_name || userToDelete?.email || ''}
        itemType={t('user', 'User')}
        isLoading={false}
      />
    </div>
  )
}

