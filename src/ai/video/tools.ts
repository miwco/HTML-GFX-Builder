// The forced-tool schemas of the video harness (the same structured-output mechanism as
// the SPX provider's emit_template): the Motion Director's plan, the coder's module, and
// the cheap skill classifier.

import type { ClaudeTool } from '../anthropic';
import { SKILLS } from './skills';

export const MOTION_PLAN_TOOL: ClaudeTool = {
  name: 'emit_motion_plan',
  description: 'Return the structured motion-design plan for the video.',
  input_schema: {
    type: 'object',
    required: ['concept', 'visualDirection', 'typography', 'background', 'easingApproach', 'assetUsage', 'phases'],
    additionalProperties: false,
    properties: {
      concept: { type: 'string', description: 'The one-sentence creative idea.' },
      visualDirection: { type: 'string', description: 'Composition, color, depth, texture direction.' },
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
  description: 'Return the complete Remotion composition module.',
  input_schema: {
    type: 'object',
    required: ['summary', 'tsx'],
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: 'One sentence describing the composition for the user.' },
      tsx: {
        type: 'string',
        description: "The COMPLETE tsx module: imports only from 'react' and 'remotion', default-exports the composition component.",
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
  phases: { name: string; startSec: number; endSec: number; description: string }[];
}

export interface EmittedModule {
  summary: string;
  tsx: string;
}
