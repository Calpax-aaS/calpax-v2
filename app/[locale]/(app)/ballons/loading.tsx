import { ListSkeleton } from '@/components/list-skeleton'

export default function Loading() {
  return <ListSkeleton rows={5} columnWidths={['w-32', 'w-24', 'w-20', 'w-28 flex-1', 'w-20']} />
}
