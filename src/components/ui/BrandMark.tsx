import logoUrl from '../../assets/mago-wordmark.svg'

type BrandMarkProps = {
  compact?: boolean
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={compact ? 'brand-mark brand-mark--compact' : 'brand-mark'}>
      <img src={logoUrl} alt="MAGO" />
    </div>
  )
}
