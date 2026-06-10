/**
 * AI Adapter Factory
 *
 * Creates the correct adapter instance based on provider protocol.
 */

import type { AIAdapter, ProviderConfig } from './types';
import { OpenAICompatAdapter } from './adapters/OpenAICompatAdapter';
import { AnthropicAdapter } from './adapters/AnthropicAdapter';

export class AdapterFactory {
  createAdapter(provider: ProviderConfig, apiKey: string): AIAdapter {
    if (provider.protocol === 'anthropic') {
      return new AnthropicAdapter({
        baseURL: provider.baseURL,
        apiKey,
        extraHeaders: provider.extraHeaders,
      });
    }

    return new OpenAICompatAdapter({
      baseURL: provider.baseURL,
      apiKey,
      authType: provider.authType,
      authHeaderName: provider.authHeaderName,
      extraHeaders: provider.extraHeaders,
    });
  }
}
