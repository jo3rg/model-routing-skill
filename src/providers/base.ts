import type {
  ModelProvider,
  ProviderMessage,
  ProviderRequest,
  ProviderResponse,
  ProviderName,
  TokenUsage,
} from '../types/index.js';

type OpenAICompatibleContent = string | Array<{ type?: string; text?: string }>;

interface OpenAICompatibleChoice {
  message?: {
    content?: OpenAICompatibleContent;
  };
}

interface OpenAICompatibleResponse {
  choices?: OpenAICompatibleChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export abstract class OpenAICompatibleProvider implements ModelProvider {
  abstract readonly name: ProviderName;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {}

  protected buildBody(request: ProviderRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.modelId,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    };

    if (request.reasoningEffort) {
      body.reasoning_effort = request.reasoningEffort;
    }

    return body;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.extraHeaders,
      },
      body: JSON.stringify(this.buildBody(request)),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${this.name} provider request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as OpenAICompatibleResponse;
    const content = coerceContent(payload.choices?.[0]?.message?.content);

    const usage = mapUsage(payload.usage);

    return {
      provider: this.name,
      modelId: request.modelId,
      content,
      ...(usage ? { usage } : {}),
      raw: payload,
    };
  }
}

function coerceContent(content: OpenAICompatibleContent | undefined): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        return item.text ?? '';
      })
      .join('')
      .trim();
  }

  return '';
}

function mapUsage(usage: OpenAICompatibleResponse['usage']): TokenUsage | undefined {
  if (!usage) {
    return undefined;
  }

  const mapped: TokenUsage = {};

  if (usage.prompt_tokens !== undefined) {
    mapped.promptTokens = usage.prompt_tokens;
  }
  if (usage.completion_tokens !== undefined) {
    mapped.completionTokens = usage.completion_tokens;
  }
  if (usage.total_tokens !== undefined) {
    mapped.totalTokens = usage.total_tokens;
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

export function buildMessages(systemPrompt: string, userPrompt: string): ProviderMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
