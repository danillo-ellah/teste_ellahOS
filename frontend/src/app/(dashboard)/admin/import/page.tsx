'use client'

import { ImportWizard } from './_components/ImportWizard'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe clientes, contatos ou jobs a partir de arquivos CSV ou Excel (XLSX).
        </p>
      </div>
      <ImportWizard />
    </div>
  )
}
