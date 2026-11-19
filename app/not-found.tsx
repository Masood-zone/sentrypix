import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, FileLock2, LockOpen } from "lucide-react"

export default function NotFound() {
  return (
    <section className="page-container grid min-h-[65svh] items-center py-16">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 rounded-2xl border bg-card p-8 shadow-sm sm:p-12 md:grid-cols-[1fr_auto]">
        <div>
          <span className="eyebrow">404 · Page not found</span>
          <h1 className="mt-5 max-w-xl font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            We couldn’t find that page.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            The address may have changed. You can return home or start a file
            protection task from here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="link-button">
              <ArrowLeft className="size-4" /> Return home
            </Link>
            <Link href="/encrypt" className="link-button-outline">
              <FileLock2 className="size-4" /> Encrypt a file
            </Link>
            <Link href="/decrypt" className="link-button-outline">
              <LockOpen className="size-4" /> Decrypt a file
            </Link>
          </div>
        </div>
        <Image
          src="/android-chrome-512x512.png"
          alt=""
          width={232}
          height={232}
          className="mx-auto size-48 object-contain sm:size-56"
        />
      </div>
    </section>
  )
}
