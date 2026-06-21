/** Shared Prompt API language options for availability + session create. */
export const MODEL_LANG_OPTIONS = {
  expectedInputs: [
    { type: 'text' as const, languages: ['en', 'es'] as string[] },
    { type: 'image' as const },
  ],
  expectedOutputs: [{ type: 'text' as const, languages: ['en', 'es'] as string[] }],
};
