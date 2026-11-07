'use client';

import { LogOut } from 'lucide-react';
import { useTransition } from 'react';

import { signOut } from '@/app/(app)/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils/initials';

type UserMenuProps = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

/** Avatar button in the header; the menu holds the user's info and "Cerrar sesión". */
export function UserMenu({ name, email, avatarUrl }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const displayName = name ?? email ?? 'Tu cuenta';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-lg sm:pr-2"
        aria-label={`Menú de ${displayName}`}
      >
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{getInitials(name ?? email)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">
          {name?.split(' ')[0] ?? displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{displayName}</span>
          {email && name && (
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          // Keep the menu open while signing out; signOut redirects to /login.
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => signOut());
          }}
        >
          <LogOut aria-hidden />
          {isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
