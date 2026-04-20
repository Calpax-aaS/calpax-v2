import { ListSkeleton } from '@/components/list-skeleton'

export default function Loading() {
  return <ListSkeleton rows={6} columnWidths={['w-32', 'w-40 flex-1', 'w-20', 'w-24']} />
}
