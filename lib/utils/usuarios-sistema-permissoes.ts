export function obterPermissaoRevisarQualidade(formData: FormData): boolean {
  return formData.get('pode_revisar_qualidade') === 'true'
}
