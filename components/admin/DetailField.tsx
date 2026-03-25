interface DetailFieldProps {
  label: string
  value: string
}

export function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
