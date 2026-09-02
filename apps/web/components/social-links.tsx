"use client";

import posthog from "posthog-js";
import { env } from "@/env";

export interface SocialLinksProps {
  className?: string;
  showLabel?: boolean;
  xUrl?: string;
  xHandle?: string;
  githubUrl?: string;
  facebookUrl?: string;
}

export function SocialLinks({
  className = "",
  showLabel = false,
  xUrl: customXUrl,
  xHandle: customXHandle,
  githubUrl: customGithubUrl,
  facebookUrl: customFacebookUrl,
}: SocialLinksProps) {
  const xUrl = customXUrl || env.NEXT_PUBLIC_X_URL;
  const xHandle = customXHandle || env.NEXT_PUBLIC_X_HANDLE;
  const githubUrl = customGithubUrl || env.NEXT_PUBLIC_GITHUB_URL;
  const facebookUrl = customFacebookUrl || env.NEXT_PUBLIC_FACEBOOK_URL;

  const handleXClick = () => {
    posthog.capture("social_link_clicked", {
      platform: "x",
      handle: xHandle,
      url: xUrl,
    });
  };

  const handleGithubClick = () => {
    posthog.capture("social_link_clicked", {
      platform: "github",
      url: githubUrl,
    });
  };

  const handleFacebookClick = () => {
    posthog.capture("social_link_clicked", {
      platform: "facebook",
      url: facebookUrl,
    });
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* GitHub (Open Source) */}
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleGithubClick}
        title="Código aberto no GitHub"
        aria-label="Código aberto no GitHub"
        className="flex items-center gap-1.5 rounded-md p-1.5 text-mutedText text-xs transition-colors hover:bg-gray-200/60 hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-current"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        {showLabel && (
          <span className="font-medium text-[11px] text-mutedText">GitHub</span>
        )}
      </a>

      {/* X.com (Twitter) */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleXClick}
        title={`Siga ${xHandle} no X`}
        aria-label={`Siga ${xHandle} no X (Twitter)`}
        className="flex items-center gap-1.5 rounded-md p-1.5 text-mutedText text-xs transition-colors hover:bg-gray-200/60 hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-current"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        {showLabel && (
          <span className="font-medium text-[11px] text-mutedText">
            {xHandle}
          </span>
        )}
      </a>

      {/* Facebook */}
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleFacebookClick}
        title="Siga no Facebook"
        aria-label="Página oficial no Facebook"
        className="flex items-center gap-1.5 rounded-md p-1.5 text-mutedText text-xs transition-colors hover:bg-gray-200/60 hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-current"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        {showLabel && (
          <span className="font-medium text-[11px] text-mutedText">
            Facebook
          </span>
        )}
      </a>
    </div>
  );
}
