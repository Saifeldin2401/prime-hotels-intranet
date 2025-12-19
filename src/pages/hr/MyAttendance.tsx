import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAttendance, useCheckIn, useCheckOut } from '@/hooks/useAttendance'
import { Clock, LogIn, LogOut, Calendar as CalendarIcon, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { MotionWrapper } from '@/components/ui/MotionWrapper'

export default function MyAttendance() {
    const { data: attendance, isLoading } = useAttendance()
    const checkInMutation = useCheckIn()
    const checkOutMutation = useCheckOut()
    const [notes, setNotes] = useState('')

    const todayAttendance = attendance?.find(
        (a) => a.date === new Date().toISOString().split('T')[0]
    )

    const handleCheckIn = async () => {
        try {
            await checkInMutation.mutateAsync({ notes })
            toast.success('Successfully checked in')
            setNotes('')
        } catch (error) {
            toast.error('Failed to check in')
        }
    }

    const handleCheckOut = async () => {
        if (!todayAttendance) return
        try {
            await checkOutMutation.mutateAsync({ id: todayAttendance.id, notes })
            toast.success('Successfully checked out')
            setNotes('')
        } catch (error) {
            toast.error('Failed to check out')
        }
    }

    return (
        <MotionWrapper>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
                        <p className="text-muted-foreground">Track your daily clock-in and clock-out times.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{format(new Date(), 'pp')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status Card */}
                    <Card className="md:col-span-1 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                Current Status
                            </CardTitle>
                            <CardDescription>Your status for today</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-6 gap-4">
                                {todayAttendance?.check_in ? (
                                    todayAttendance.check_out ? (
                                        <Badge variant="outline" className="px-4 py-1 text-lg">Shift Completed</Badge>
                                    ) : (
                                        <Badge variant="default" className="px-4 py-1 text-lg bg-green-500 hover:bg-green-600">On Duty</Badge>
                                    )
                                ) : (
                                    <Badge variant="secondary" className="px-4 py-1 text-lg">Off Duty</Badge>
                                )}

                                {todayAttendance?.check_in && (
                                    <p className="text-sm text-muted-foreground">
                                        Started at: {format(new Date(todayAttendance.check_in), 'pp')}
                                    </p>
                                )}
                                {todayAttendance?.check_out && (
                                    <p className="text-sm text-muted-foreground">
                                        Finished at: {format(new Date(todayAttendance.check_out), 'pp')}
                                    </p>
                                )}
                            </div>

                            {!todayAttendance?.check_in && (
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleCheckIn}
                                    disabled={checkInMutation.isPending}
                                >
                                    <LogIn className="w-5 h-5 mr-2" />
                                    Clock In
                                </Button>
                            )}

                            {todayAttendance?.check_in && !todayAttendance?.check_out && (
                                <Button
                                    className="w-full h-12 text-lg bg-red-600 text-white hover:bg-red-700 shadow-md border-0"
                                    onClick={handleCheckOut}
                                    disabled={checkOutMutation.isPending}
                                >
                                    <LogOut className="w-5 h-5 mr-2" />
                                    Clock Out
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* History Card */}
                    <Card className="md:col-span-2 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                Recent History
                            </CardTitle>
                            <CardDescription>Your last 30 days of attendance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {attendance?.map((record) => (
                                            <motion.div
                                                key={record.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-primary/5 rounded-full">
                                                        <CalendarIcon className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{format(new Date(record.date), 'EEE, MMM d')}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {record.check_in ? format(new Date(record.check_in), 'p') : '--'} - {record.check_out ? format(new Date(record.check_out), 'p') : 'Active'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={record.status === 'present' ? 'default' : 'secondary'}
                                                    className={record.status === 'present' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20' : ''}
                                                >
                                                    {record.status}
                                                </Badge>
                                            </motion.div>
                                        ))}
                                        {attendance?.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No attendance records found.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MotionWrapper>
    )
}
