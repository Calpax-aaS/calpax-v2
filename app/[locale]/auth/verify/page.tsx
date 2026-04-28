import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function VerifyPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('signin')

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="w-full max-w-md rounded-2xl shadow-xl bg-white px-8 py-12 text-center">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.svg"
            alt="Calpax"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <h1 className="text-[26px] font-bold text-primary mt-3">Calpax</h1>
        </div>

        <h2 className="text-[18px] font-semibold text-foreground mb-3">{t('verifyTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-8">{t('verifySent')}</p>

        <Link
          href={`/${locale}/auth/signin`}
          className="inline-block text-sm text-primary hover:underline"
        >
          {t('backToSignin')}
        </Link>
      </div>
    </main>
  )
}
