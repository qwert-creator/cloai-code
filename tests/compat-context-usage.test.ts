import { describe, expect, test } from 'bun:test'

import { createAnthropicStreamFromGemini } from '../src/services/api/geminiLike'
import {
  createAnthropicStreamFromOpenAI,
  createAnthropicStreamFromOpenAIResponses,
} from '../src/services/api/openaiCompat'

function createReaderFromSSEEvents(events: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(events.join('')))
      controller.close()
    },
  })
  return stream.getReader()
}

async function collectStreamEvents<TEvent, TReturn>(
  generator: AsyncGenerator<TEvent, TReturn, void>,
): Promise<{ events: TEvent[]; result: TReturn }> {
  const events: TEvent[] = []
  while (true) {
    const next = await generator.next()
    if (next.done) {
      return { events, result: next.value }
    }
    events.push(next.value)
  }
}

describe('compat provider usage propagation', () => {
  test('OpenAI chat completions stream emits input usage on message_delta when usage arrives at finish', async () => {
    const reader = createReaderFromSSEEvents([
      'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"hi"}}]}\n\n',
      'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":321,"completion_tokens":12}}\n\n',
      'data: [DONE]\n\n',
    ])

    const { events } = await collectStreamEvents(
      createAnthropicStreamFromOpenAI({ reader, model: 'gpt-5.4' }),
    )

    const messageDelta = events.find(
      event =>
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'message_delta',
    ) as { usage?: { input_tokens?: number; output_tokens?: number } }

    expect(messageDelta.usage?.input_tokens).toBe(321)
    expect(messageDelta.usage?.output_tokens).toBe(12)
  })

  test('OpenAI responses stream emits input and cache usage on message_delta after completion', async () => {
    const reader = createReaderFromSSEEvents([
      'data: {"type":"response.output_item.added","item":{"type":"message"}}\n\n',
      'data: {"type":"response.output_text.delta","delta":"hello"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp-1","usage":{"input_tokens":34567,"output_tokens":789,"input_tokens_details":{"cached_tokens":1234}}}}\n\n',
      'data: [DONE]\n\n',
    ])

    const { events } = await collectStreamEvents(
      createAnthropicStreamFromOpenAIResponses({ reader, model: 'gpt-5.4' }),
    )

    const messageDelta = events.find(
      event =>
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'message_delta',
    ) as {
      usage?: {
        input_tokens?: number
        output_tokens?: number
        cache_read_input_tokens?: number
        cache_creation_input_tokens?: number
      }
    }

    expect(messageDelta.usage?.input_tokens).toBe(34567)
    expect(messageDelta.usage?.cache_read_input_tokens).toBe(1234)
    expect(messageDelta.usage?.cache_creation_input_tokens).toBe(33333)
    expect(messageDelta.usage?.output_tokens).toBe(789)
  })

  test('Gemini stream emits prompt and cache usage on message_delta after completion', async () => {
    const reader = createReaderFromSSEEvents([
      'data: {"candidates":[{"content":{"parts":[{"text":"hello"}]}}],"usageMetadata":{"promptTokenCount":20000,"cachedContentTokenCount":5000,"candidatesTokenCount":400,"thoughtsTokenCount":56}}\n\n',
      'data: {"candidates":[{"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":20000,"cachedContentTokenCount":5000,"candidatesTokenCount":400,"thoughtsTokenCount":56}}\n\n',
      'data: [DONE]\n\n',
    ])

    const { events } = await collectStreamEvents(
      createAnthropicStreamFromGemini({ reader, model: 'gemini-2.5-pro' }),
    )

    const messageDelta = events.find(
      event =>
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'message_delta',
    ) as {
      usage?: {
        input_tokens?: number
        output_tokens?: number
        cache_read_input_tokens?: number
        cache_creation_input_tokens?: number
      }
    }

    expect(messageDelta.usage?.input_tokens).toBe(15000)
    expect(messageDelta.usage?.cache_read_input_tokens).toBe(5000)
    expect(messageDelta.usage?.cache_creation_input_tokens).toBe(0)
    expect(messageDelta.usage?.output_tokens).toBe(456)
  })
})

