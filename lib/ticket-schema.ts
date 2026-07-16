import { z } from "zod";

// A ticket's `doc` is the structured work specification the fleet coordinates around. zod validates
// SHAPE ONLY (D-08): a valid doc is NEVER a claim the work is correct or safe to merge — code
// correctness is CI/tests/review. The schema is versioned; when it changes, add a new version and
// keep the old ones parsing (migrate-on-read discipline inherited from Knovo's slot schema).

export const CURRENT_SCHEMA_VERSION = 1;

const planStep = z.object({
  title: z.string().min(1),
  detail: z.string().optional(),
});

// v1 — a lean, dev-native work spec. `.strict()` rejects unknown keys so typos surface instead of
// silently persisting (no-escape discipline). Bump the version to add fields.
const ticketDocV1 = z
  .object({
    schemaVersion: z.literal(1).default(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    goal: z.string().min(1), // what success looks like
    acceptanceCriteria: z.array(z.string().min(1)).default([]),
    context: z.string().optional(),
    constraints: z.array(z.string().min(1)).optional(),
    plan: z.object({ steps: z.array(planStep) }).optional(), // filled/refined by the Planner
  })
  .strict();

export type TicketDocV1 = z.infer<typeof ticketDocV1>;
export type TicketDoc = TicketDocV1;

// Version → parser registry. Old versions stay here so historical docs keep validating. The Input
// type is `unknown` because `.default()` makes a doc's parsed input differ from its output shape.
const PARSERS: Record<number, z.ZodType<TicketDoc, z.ZodTypeDef, unknown>> = {
  1: ticketDocV1,
};

export type TicketDocParseResult =
  | { success: true; data: TicketDoc }
  | { success: false; error: z.ZodError | string };

// Validate a ticket doc against the parser for its declared version. Returns a discriminated result
// (never throws) so the API can turn a failure into a 422 with a readable message.
export function safeParseTicketDoc(version: number, doc: unknown): TicketDocParseResult {
  const parser = PARSERS[version];
  if (!parser) {
    return { success: false, error: `unsupported ticket schema version: ${version}` };
  }
  const res = parser.safeParse(doc);
  return res.success ? { success: true, data: res.data } : { success: false, error: res.error };
}
