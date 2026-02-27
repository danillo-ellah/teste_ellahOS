import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobFinanceiroPage({ params }: Props) {
  const { id } = await params
  redirect(`/jobs/${id}/financeiro/custos`)
}
