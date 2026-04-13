import type { ModelProvider, ProviderRequest, ProviderResponse, ProviderName } from '../types/index.js';

export class MockProvider implements ModelProvider {
  public readonly calls: ProviderRequest[] = [];

  constructor(
    public readonly name: ProviderName,
    private readonly responder: (request: ProviderRequest) => string,
  ) {}

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push(request);

    return {
      provider: this.name,
      modelId: request.modelId,
      content: this.responder(request),
    };
  }
}
