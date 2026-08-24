"use client";

import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BaseModal } from "./base-modal";
import { TransparenciaLogo } from "./transparencia-logo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project")) {
      setErrorMessage(
        "Não foi possível enviar o link de acesso neste momento. Por favor, tente novamente em instantes.",
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(
          "Não foi possível enviar o link de acesso neste momento. Por favor, tente novamente em instantes.",
        );
      } else {
        setSentSuccess(true);
      }
    } catch (_err) {
      setErrorMessage(
        "Não foi possível enviar o link de acesso neste momento. Por favor, tente novamente em instantes.",
      );
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = (
    <h2 className="font-bold text-base text-slate-900">
      Acesso ao Portal da Transparência
    </h2>
  );

  const modalSubtitle = (
    <p className="text-slate-500 text-xs">
      Histórico na nuvem e cota expandida de consultas
    </p>
  );

  const modalIcon = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-xs">
      <TransparenciaLogo className="h-10 w-10" />
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={modalIcon}
      maxWidthClass="max-w-md"
    >
      {sentSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mt-2 font-bold text-emerald-900 text-sm">
            Link Mágico Enviado!
          </h3>
          <p className="mt-1 text-emerald-700 text-xs">
            Enviamos um e-mail para{" "}
            <strong className="font-semibold">{email}</strong>. Clique no link
            recebido para entrar instantaneamente em 1 clique.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentSuccess(false);
              setEmail("");
            }}
            className="mt-4 cursor-pointer rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-medium text-emerald-800 text-xs transition-colors hover:bg-emerald-100"
          >
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-[#5a72a8]/20 bg-[#5a72a8]/5 p-3 text-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#5a72a8]" />
              <span>Cota ampliada de consultas diárias ao assistente</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Histórico salvo com segurança na sua conta</span>
            </div>
          </div>

          <form onSubmit={handleSendMagicLink} className="space-y-3">
            <div>
              <label
                htmlFor="auth-email-input"
                className="mb-1 block font-medium text-slate-700 text-xs"
              >
                Seu E-mail Profissional ou Pessoal
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-slate-900 text-xs shadow-xs focus:border-[#5a72a8] focus:outline-none focus:ring-1 focus:ring-[#5a72a8]"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800 text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5a72a8] py-2.5 font-semibold text-white text-xs shadow-xs transition-colors transition-colors hover:bg-[#4a5f8c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {loading ? "Enviando..." : "Receber Link Mágico por E-mail"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </BaseModal>
  );
}
