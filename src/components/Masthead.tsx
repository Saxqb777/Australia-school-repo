import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth-actions";

interface MastheadProps {
  userName?: string;
  roleLabel?: string;
  home?: string;
}

export function Masthead({ userName, roleLabel, home = "/" }: MastheadProps) {
  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={home} className="flex min-w-0 items-center gap-3">
          <Image src="/crest.png" alt="" width={34} height={31} priority className="shrink-0" />
          <span className="min-w-0">
            <span className="label-caps block truncate !text-[0.66rem]">Australian School of Abu Dhabi</span>
            <span className="block truncate font-cond text-[1.05rem] font-semibold leading-tight text-navy">
              Observation Hub
            </span>
          </span>
        </Link>
        {userName ? (
          <div className="ml-auto flex items-center gap-3 text-right">
            <span className="hidden sm:block">
              <span className="block text-sm font-medium leading-tight">{userName}</span>
              {roleLabel ? <span className="label-caps block !text-[0.62rem]">{roleLabel}</span> : null}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-quiet !min-h-9 !px-3 !text-sm">
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
