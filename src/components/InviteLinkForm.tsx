"use client";
import { useActionState, useState } from "react";
import { createInviteLink, type InviteState } from "@/app/actions/accounts";

export function InviteLinkForm({ userId, label }: { userId: string; label: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInviteLink, {});
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : label}</button>
      </form>
      {state.error && <div className="text-sm text-red-700">{state.error}</div>}
      {state.link && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <div className="mb-1 font-medium text-green-900">Одноразовая ссылка (действует до {new Date(state.expiresAt!).toLocaleString("ru-RU")}). Покажется только сейчас — передайте её пользователю лично или по почте.</div>
          <div className="flex gap-2">
            <input readOnly value={state.link} className="input w-full font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn" onClick={() => { navigator.clipboard.writeText(state.link!); setCopied(true); }}>{copied ? "✓" : "Копировать"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
