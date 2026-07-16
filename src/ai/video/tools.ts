// The forced-tool schemas of the video harness (the same structured-output mechanism as
// the SPX provider's emit_template): the Motion Director's plan, the coder's module, and
// the cheap skill classifier.

import type { ClaudeTool } from '../anthropic';
import type { VideoInputType } from '../../model/videoTypes';
import { SKILLS } from './skills';

export const MOTION_PLAN_TOOL: ClaudeTool = {
  name: 'emit_motion_plan',
  description: 'Return the structured motion-design plan for the video.',
  input_schema: {
    type: 'object',
    required: ['concept', 'visualDirection', 'typography', 'background', 'easingApproach', 'assetUsage', 'layering', 'phases'],
    additionalProperties: false,
    properties: {
      concept: { type: 'string', description: 'The one-sentence creative idea.' },
      visualDirection: { type: 'string', description: 'Composition, color, depth, texture direction.' },
      layering: {
        type: 'string',
        description:
          'The stacking order back-to-front at the hero moment (background -> shape layers -> text/logo on top), and which layers exit first. Text is never covered once it is readable.',
      },
      typography: { type: 'string', description: 'Type hierarchy: faces, weights, casing, sizes relative to the frame.' },
      background: { type: 'string', description: "Background treatment; 'transparent' when the project renders with alpha." },
      easingApproach: { type: 'string', description: 'Spring vs interpolate character, overshoot policy, exit speed.' },
      assetUsage: { type: 'string', description: "How each named asset is used, or 'none'." },
      phases: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        description: 'The timed phases covering the full duration, in order.',
        items: {
          type: 'object',
          required: ['name', 'startSec', 'endSec', 'description'],
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            startSec: { type: 'number' },
            endSec: { type: 'number' },
            description: { type: 'string', description: 'What enters, moves, exits - concrete and timed.' },
          },
        },
      },
    },
  },
};

export const REMOTION_MODULE_TOOL: ClaudeTool = {
  name: 'emit_remotion_module',
  description: 'Return the complete Remotion composition module and its editable inputs.',
  input_schema: {
    type: 'object',
    required: ['summary', 'tsx', 'inputs'],
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: 'One sentence describing the composition for the user.' },
      tsx: {
        type: 'string',
        description: "The COMPLETE tsx module: imports only from 'react' and 'remotion', default-exports the composition component.",
      },
      inputs: {
        type: 'array',
        maxItems: 8,
        description:
          "The editable inputs a non-technical user should be able to change WITHOUT touching code (the headline text, a subtitle, an accent colour, a score, which uploaded image fills a logo slot). Declare each value the module reads from its `fields` prop; the code must fall back to `default` (`fields.key ?? default`). Keep purely structural/timing values in code - expose only real content choices. Return [] only when the piece genuinely has no user-editable content.",
        items: {
          type: 'object',
          required: ['key', 'type', 'label', 'default'],
          additionalProperties: false,
          properties: {
            key: {
              type: 'string',
              pattern: '^[a-z][a-zA-Z0-9]*$',
              description: "The `fields.<key>` prop the module reads (a camelCase identifier, e.g. 'headline').",
            },
            type: { type: 'string', enum: ['text', 'number', 'color', 'select', 'image'] },
            label: { type: 'string', description: 'Short human label for the Content panel (e.g. "Headline", "Logo").' },
            default: {
              description:
                "The default value - MUST equal the fallback in code. String for text/color/select; number for number. For 'image' it is a project asset's LOGICAL NAME (or '' for none), which the module resolves against the assets prop: `assets[String(fields.key ?? '')]`.",
              type: ['string', 'number'],
            },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: "'select' only: the allowed string choices.",
            },
            min: { type: 'number', description: "'number' only: minimum." },
            max: { type: 'number', description: "'number' only: maximum." },
            step: { type: 'number', description: "'number' only: step." },
          },
        },
      },
    },
  },
};

export const DETECT_SKILLS_TOOL: ClaudeTool = {
  name: 'detect_skills',
  description: 'Pick the motion-design skills most relevant to the request.',
  input_schema: {
    type: 'object',
    required: ['skills'],
    additionalProperties: false,
    properties: {
      skills: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string', enum: SKILLS.map((s) => s.id) },
      },
    },
  },
};

export interface EmittedMotionPlan {
  concept: string;
  visualDirection: string;
  typography: string;
  background: string;
  easingApproach: string;
  assetUsage: string;
  layering: string;
  phases: { name: string; startSec: number; endSec: number; description: string }[];
}

export interface EmittedInput {
  key: string;
  type: VideoInputType;
  label: string;
  default: string | number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface EmittedModule {
  summary: string;
  tsx: string;
  inputs?: EmittedInput[];
}
