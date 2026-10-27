/**
 * NVVAI owner workspace AI. Credentials remain Worker secrets.
 * Azure is the default. Optional Vertex AI failover uses the private
 * LiteLLM gateway on the VPS (where Google ADC stays), not browser tokens.
 */
const DEFAULT_AZURE_RESPONSES_URL =
  'https://agentdock-ai-resource.services.ai.azure.com/openai/v1/responses';
const DEFAULT_AZURE_MODEL = 'gpt-4.1-mini';
const SYSTEM_INSTRUCTIONS =
  'You are the NVVAI business-owner workspace assistant. Answer in the language ' +
  'used by the owner. Help organize service requests and plan follow-up, but do not ' +
  'claim to have booked a technician, contacted a customer, modified a lead, or ' +
  'performed an external action. Do not invent lead details or disclose other tenants.';

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  return (data?.output || [])
    .filter((item) => item?.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('').trim();
}

function azureUrl(value) {
  const url = new URL(value || DEFAULT_AZURE_RESPONSES_URL);
  const trusted = url.hostname.endsWith('.openai.azure.com')
    || url.hostname.endsWith('.services.ai.azure.com');
  if (url.protocol !== 'https:' || !trusted
    || url.pathname !== '/openai/v1/responses' || url.search || url.hash) {
    throw new Error('Azure AI endpoint configuration is invalid');
  }
  return url.toString();
}

function vertexGatewayUrl(value) {
  if (!value) throw new Error('Vertex AI gateway is not configured');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.nvvai.site')
    || url.pathname !== '/v1/chat/completions' || url.search || url.hash) {
    throw new Error('Vertex AI gateway endpoint configuration is invalid');
  }
  return url.toString();
}

async function requestAzure(message, options) {
  if (!options.azureKey) throw new Error('Azure AI is not configured');
  const response = await options.fetchImpl(azureUrl(options.azureEndpoint), {
    method: 'POST',
    headers: {
      'api-key': options.azureKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.azureModel || DEFAULT_AZURE_MODEL,
      instructions: SYSTEM_INSTRUCTIONS,
      input: message,
      max_output_tokens: 900,
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    const error = new Error('Azure AI request failed');
    error.status = response.status;
    throw error;
  }
  const text = extractResponseText(await response.json());
  if (!text) throw new Error('Azure AI returned no reply');
  return text;
}

async function requestVertex(message, options) {
  if (!options.vertexKey || !options.vertexModel) {
    throw new Error('Vertex AI gateway is not configured');
  }
  const response = await options.fetchImpl(vertexGatewayUrl(options.vertexEndpoint), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.vertexKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.vertexModel,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        { role: 'user', content: message },
      ],
      max_tokens: 900,
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    const error = new Error('Vertex AI gateway request failed');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Vertex AI gateway returned no reply');
  }
  return text.trim();
}

export async function createOwnerChatCompletion(message, {
  azureKey, azureEndpoint, azureModel,
  vertexKey, vertexEndpoint, vertexModel,
  provider = 'azure', fetchImpl = fetch, signal,
} = {}) {
  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('Message is required');
  }
  const cleanMessage = message.trim();
  if (cleanMessage.length > 6000) {
    throw new Error('Message too long');
  }
  const options = {
    azureKey, azureEndpoint, azureModel,
    vertexKey, vertexEndpoint, vertexModel,
    fetchImpl, signal,
  };
  if (provider === 'vertex') return requestVertex(cleanMessage, options);
  if (provider !== 'azure') throw new Error('Unsupported AI provider');
  try {
    return await requestAzure(cleanMessage, options);
  } catch (error) {
    // Fail over for upstream service failures, never on missing/bad credentials.
    if (vertexKey && vertexModel && vertexEndpoint
        && (error.status === 429 || error.status >= 500)) {
      return requestVertex(cleanMessage, options);
    }
    throw error;
  }
}
