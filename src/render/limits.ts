// Render entitlements + cost-protection limits — EVERY configurable number lives here.
//
// PURE MODULE (no DOM, no import.meta): imported by the Export UI (immediate feedback,
// control clamping) and by the api/ functions (the authoritative re-check). Client-side
// checks are UX; the server always re-validates against the same table.
//
// Tiers: anonymous visitors get the basic formats with strict caps; signed-in users get
// the full format set with sensible free limits; 'paid' is fully defined but unreachable
// in v1 — introducing billing later means changing resolveTier() to read an entitlements
// table, nothing else moves.

import { RENDER_FORMATS, type RenderFormatId, type RenderManifest } from './manifest';
import { durationInFrames } from './manifest';

export type RenderTier = 'anonymous' | 'free' | 'paid';

export interface TierCaps {
  formats: RenderFormatId[];
  maxWidth: number;
  maxHeight: number;
  /** Output pixels (width×scale × height×scale) — the real cost driver. */
  maxPixels: number;
  maxFps: number;
  maxDurationSec: number;
  /** Per-format tighter duration caps (heavy outputs). */
  maxDurationSecByFormat?: Partial<Record<RenderFormatId, number>>;
  maxOutputBytes: number;
  /** Simultaneously running jobs per principal (user id or anonymous IP hash). */
  maxConcurrent: number;
  /** Job creations per principal per window. */
  perHour: number;
  perDay: number;
}

export const RENDER_LIMITS: Record<RenderTier, TierCaps> = {
  anonymous: {
    formats: ['mp4', 'webm', 'png-still'],
    maxWidth: 1920, maxHeight: 1920, maxPixels: 1920 * 1080,
    maxFps: 30,
    maxDurationSec: 15,
    maxOutputBytes: 200_000_000,
    maxConcurrent: 1,
    perHour: 2,
    perDay: 6,
  },
  free: {
    formats: ['mp4', 'webm', 'png-still', 'png-sequence', 'prores4444'],
    maxWidth: 1920, maxHeight: 1920, maxPixels: 1920 * 1080,
    maxFps: 60,
    maxDurationSec: 60,
    maxDurationSecByFormat: { prores4444: 30, 'png-sequence': 30 },
    maxOutputBytes: 2_000_000_000,
    maxConcurrent: 2,
    perHour: 10,
    perDay: 40,
  },
  paid: {
    formats: ['mp4', 'webm', 'png-still', 'png-sequence', 'prores4444'],
    maxWidth: 4096, maxHeight: 4096, maxPixels: 4096 * 2304,
    maxFps: 60,
    maxDurationSec: 300,
    maxOutputBytes: 8_000_000_000,
    maxConcurrent: 4,
    perHour: 30,
    perDay: 150,
  },
};

/** Formats that require at least a signed-in account (ProRes stays gated so a future
 *  paid tier can take it over without UI rework). */
export function formatNeedsSignIn(format: RenderFormatId): boolean {
  return !RENDER_LIMITS.anonymous.formats.includes(format);
}

/** All the non-tier knobs — one object, no scattered magic numbers. */
export const RENDER_CONFIG = {
  /** Serialized manifest cap — stays under Vercel's 4.5 MB function body limit. */
  manifestMaxBytes: 4_000_000,
  /** Output download TTL per tier (ms). */
  outputTtlMs: { anonymous: 2 * 3600_000, free: 24 * 3600_000, paid: 7 * 86_400_000 } as Record<RenderTier, number>,
  /** How often the browser polls job status (also returned by the start endpoint). */
  pollIntervalMs: 2500,
  /** How often the worker rewrites progress.json (throttle). */
  progressWriteIntervalMs: 1000,
  /** Grace past the sandbox deadline before a silent job counts as lost. */
  abandonedSlackMs: 5 * 60_000,
  /** Default warning threshold for short holds. */
  minHoldMs: 500,
  sandbox: {
    runtime: 'node24',
    vcpus: 4,
    /** Per-job wall clock: provisioning + a generous per-frame budget + upload slack,
     *  clamped to stay inside the platform ceiling. */
    timeoutMs(frames: number, pixelsPerFrame: number): number {
      const provisionMs = 6 * 60_000;
      const perFrameMs = pixelsPerFrame > 1920 * 1080 ? 1200 : 500;
      const uploadSlackMs = 3 * 60_000;
      const raw = provisionMs + frames * perFrameMs + uploadSlackMs;
      return Math.min(Math.max(raw, 10 * 60_000), 40 * 60_000);
    },
  },
} as const;

export function resolveTier(signedIn: boolean): RenderTier {
  return signedIn ? 'free' : 'anonymous';
}

export interface LimitIssue {
  code:
    | 'format-signin'
    | 'format-tier'
    | 'resolution'
    | 'fps'
    | 'duration'
    | 'manifest-size';
  message: string;
}

/** The subset of the manifest the limit checks need (the server summarizes before parsing
 *  the multi-MB document). */
export type ManifestSummary = Pick<RenderManifest, 'width' | 'height' | 'fps' | 'scale' | 'timing' | 'output'>;

/** Validate a render request against a tier. Empty result = allowed. */
export function validateRenderRequest(m: ManifestSummary, tier: RenderTier): LimitIssue[] {
  const caps = RENDER_LIMITS[tier];
  const issues: LimitIssue[] = [];
  const format = m.output.format;

  if (!caps.formats.includes(format)) {
    issues.push(
      tier === 'anonymous' && formatNeedsSignIn(format)
        ? { code: 'format-signin', message: `${RENDER_FORMATS[format].label} requires signing in.` }
        : { code: 'format-tier', message: `${RENDER_FORMATS[format].label} is not available on your plan.` },
    );
  }

  const outW = Math.round(m.width * m.scale);
  const outH = Math.round(m.height * m.scale);
  if (outW > caps.maxWidth || outH > caps.maxHeight || outW * outH > caps.maxPixels) {
    issues.push({
      code: 'resolution',
      message: `${outW}×${outH} exceeds the ${tier === 'anonymous' ? 'anonymous' : 'current'} limit (${caps.maxWidth}×${caps.maxHeight}, ${Math.round(caps.maxPixels / 1e6)} MP).${tier === 'anonymous' ? ' Sign in for more.' : ''}`,
    });
  }

  if (m.fps > caps.maxFps) {
    issues.push({ code: 'fps', message: `${m.fps} fps exceeds the limit of ${caps.maxFps} fps.${tier === 'anonymous' ? ' Sign in for 60 fps.' : ''}` });
  }

  const maxSec = Math.min(caps.maxDurationSec, caps.maxDurationSecByFormat?.[format] ?? Infinity);
  if (m.timing.totalDurationMs > maxSec * 1000) {
    issues.push({
      code: 'duration',
      message: `${(m.timing.totalDurationMs / 1000).toFixed(0)} s exceeds the ${maxSec} s limit for ${RENDER_FORMATS[format].label}.${tier === 'anonymous' ? ' Sign in for longer renders.' : ''}`,
    });
  }

  return issues;
}

/** Sandbox wall-clock for a job (used by the executor and the abandoned-job sweep). */
export function jobTimeoutMs(m: ManifestSummary): number {
  const frames = durationInFrames(m);
  const pixels = Math.round(m.width * m.scale) * Math.round(m.height * m.scale);
  return RENDER_CONFIG.sandbox.timeoutMs(frames, pixels);
}
