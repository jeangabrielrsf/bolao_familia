import { forwardRef, type TableHTMLAttributes, type ReactNode } from 'react'

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  headers?: string[]
  children: ReactNode
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ headers, className = '', children, ...props }, ref) => {
    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={`w-full border-collapse text-sm ${className}`}
          {...props}
        >
          {headers && (
            <thead>
              <tr className="bg-primary text-white">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>{children}</tbody>
        </table>
      </div>
    )
  }
)

Table.displayName = 'Table'

interface TableRowProps {
  children: ReactNode
  className?: string
}

export function TableRow({ children, className = '' }: TableRowProps) {
  return (
    <tr className={`border-b border-border hover:bg-gray-50 transition-colors ${className}`}>
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
  header?: boolean
}

export function TableCell({ children, className = '', header }: TableCellProps) {
  const Tag = header ? 'th' : 'td'
  return (
    <Tag className={`px-4 py-3 ${header ? 'font-medium' : ''} ${className}`}>
      {children}
    </Tag>
  )
}
