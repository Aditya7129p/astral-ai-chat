export const MODEL_OPTIONS = [
  { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', provider: 'InclusionAI', description: 'Finance-focused reasoning' },
  { id: 'openrouter/free', name: 'Auto Select', provider: 'OpenRouter', description: 'Let OpenRouter choose a free model' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra', provider: 'NVIDIA', description: 'Frontier reasoning and orchestration' },
  { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1', provider: 'Poolside', description: 'Coding agent model' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning', provider: 'NVIDIA', description: 'Fast, high-throughput inference' },
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots3-Note Preview', provider: 'Dots Studio', description: 'Lightweight multimodal reasoning' },
  { id: 'thinkingmachines/inkling:free', name: 'Inkling', provider: 'Thinking Machines', description: 'General-purpose multimodal reasoning' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', provider: 'NVIDIA', description: 'Efficient multi-agent reasoning' },
  { id: 'inclusionai/ling-3.0-flash-sante:free', name: 'Ling 3.0 Flash Sante', provider: 'InclusionAI', description: 'Health and medicine focused' },
  { id: 'nex-agi/nex-n2.5-pro:free', name: 'Nex-N2.5-Pro', provider: 'Nex AGI', description: 'Agentic coding and execution' },
  { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small', provider: 'Thinking Machines', description: 'Efficient multimodal reasoning' },
  { id: 'inclusionai/ling-3.0-flash-vl:free', name: 'Ling 3.0 Flash VL', provider: 'InclusionAI', description: 'Vision-language understanding' },
  { id: 'cohere/north-mini-code:free', name: 'North Mini Code', provider: 'Cohere', description: 'Agentic coding' },
  { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1', provider: 'Poolside', description: 'Compact coding agent' },
  { id: 'nex-agi/nex-n2.5-mini:free', name: 'Nex-N2.5-Mini', provider: 'Nex AGI', description: 'Compact agentic coding' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron 3 Nano Omni', provider: 'NVIDIA', description: 'Multimodal perception and context' },
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'LFM2.5-2.6B', provider: 'Liquid', description: 'Compact reasoning model' },
  { id: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', name: 'Llama Nemotron Embed VL 1B V2', provider: 'NVIDIA', description: 'Visual and text embeddings' },
  { id: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free', name: 'Llama Nemotron Rerank VL 1B V2', provider: 'NVIDIA', description: 'Visual and text reranking' },
  { id: 'nvidia/nemotron-3.5-content-safety:free', name: 'Nemotron 3.5 Content Safety', provider: 'NVIDIA', description: 'Content safety classification' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B', provider: 'Google', description: 'Balanced multimodal reasoning' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', provider: 'Google', description: 'Multimodal reasoning and coding' },
  { id: 'nvidia/nemotron-3-embed-1b:free', name: 'Nemotron 3 Embed 1B', provider: 'NVIDIA', description: 'Text embeddings' },
  { id: 'liquid/lfm-2.5-embedding-350m:free', name: 'LFM2.5 Embedding 350M', provider: 'Liquid', description: 'Compact text embeddings' },
] as const

export type ModelId = (typeof MODEL_OPTIONS)[number]['id']

export const DEFAULT_MODEL: ModelId = 'inclusionai/ling-3.0-flash-fin:free'

export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some((model) => model.id === value)
}

export function getModelName(modelId: string) {
  return MODEL_OPTIONS.find((model) => model.id === modelId)?.name ?? modelId
}
