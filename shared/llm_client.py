"""Multi-provider LLM client.

Routes requests to the best provider based on task type and availability.
Production: Claude via Bedrock. Dev: direct API keys.
"""

from __future__ import annotations

import json
from enum import Enum
from typing import Any

import structlog

from shared.config import settings

logger = structlog.get_logger()


class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    BEDROCK = "bedrock"


class LLMTask(str, Enum):
    CLASSIFY = "classify"
    DRAFT_REPLY = "draft_reply"
    ANALYZE = "analyze"
    BULK_PROCESS = "bulk_process"
    REASON = "reason"


# Task → preferred provider chain (first available wins)
# Bedrock is primary (always available via IAM). Direct API keys are fallbacks.
TASK_ROUTING: dict[LLMTask, list[LLMProvider]] = {
    LLMTask.CLASSIFY: [LLMProvider.BEDROCK, LLMProvider.ANTHROPIC, LLMProvider.DEEPSEEK],
    LLMTask.DRAFT_REPLY: [LLMProvider.BEDROCK, LLMProvider.ANTHROPIC, LLMProvider.GEMINI],
    LLMTask.ANALYZE: [LLMProvider.BEDROCK, LLMProvider.ANTHROPIC, LLMProvider.GEMINI],
    LLMTask.BULK_PROCESS: [LLMProvider.DEEPSEEK, LLMProvider.GEMINI, LLMProvider.BEDROCK],
    LLMTask.REASON: [LLMProvider.DEEPSEEK, LLMProvider.BEDROCK, LLMProvider.ANTHROPIC],
}

# Provider → default model
DEFAULT_MODELS: dict[LLMProvider, str] = {
    LLMProvider.ANTHROPIC: "claude-sonnet-4-20250514",
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.GEMINI: "gemini-2.5-pro",
    LLMProvider.DEEPSEEK: "deepseek-chat",
    LLMProvider.BEDROCK: "us.anthropic.claude-sonnet-4-20250514-v1:0",
}


def _provider_available(provider: LLMProvider) -> bool:
    if provider == LLMProvider.ANTHROPIC:
        return settings.llm.has_anthropic
    if provider == LLMProvider.OPENAI:
        return settings.llm.has_openai
    if provider == LLMProvider.GEMINI:
        return settings.llm.has_gemini
    if provider == LLMProvider.DEEPSEEK:
        return settings.llm.has_deepseek
    if provider == LLMProvider.BEDROCK:
        return True  # Uses AWS IAM, always available if configured
    return False


def select_provider(task: LLMTask, preferred: LLMProvider | None = None) -> LLMProvider:
    """Select the best available provider for a task."""
    if preferred and _provider_available(preferred):
        return preferred
    for provider in TASK_ROUTING.get(task, [LLMProvider.ANTHROPIC]):
        if _provider_available(provider):
            return provider
    raise RuntimeError(f"No LLM provider available for task: {task}")


async def complete(
    prompt: str,
    *,
    system: str = "",
    task: LLMTask = LLMTask.CLASSIFY,
    provider: LLMProvider | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str:
    """Send a completion request to the selected LLM provider."""
    selected = select_provider(task, preferred=provider)
    model_id = model or DEFAULT_MODELS[selected]

    logger.info("llm_request", provider=selected.value, model=model_id, task=task.value)

    if selected == LLMProvider.ANTHROPIC:
        return await _call_anthropic(prompt, system=system, model=model_id, max_tokens=max_tokens, temperature=temperature)
    elif selected == LLMProvider.OPENAI:
        return await _call_openai(prompt, system=system, model=model_id, max_tokens=max_tokens, temperature=temperature)
    elif selected == LLMProvider.GEMINI:
        return await _call_gemini(prompt, system=system, model=model_id, max_tokens=max_tokens, temperature=temperature)
    elif selected == LLMProvider.DEEPSEEK:
        return await _call_deepseek(prompt, system=system, model=model_id, max_tokens=max_tokens, temperature=temperature)
    elif selected == LLMProvider.BEDROCK:
        return await _call_bedrock(prompt, system=system, model=model_id, max_tokens=max_tokens, temperature=temperature)
    else:
        raise ValueError(f"Unknown provider: {selected}")


async def complete_json(
    prompt: str,
    *,
    system: str = "",
    task: LLMTask = LLMTask.CLASSIFY,
    provider: LLMProvider | None = None,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """Complete and parse JSON response."""
    raw = await complete(prompt, system=system, task=task, provider=provider, max_tokens=max_tokens, temperature=0.1)
    # Extract JSON from response (handle markdown code blocks)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text)


async def _call_anthropic(prompt: str, *, system: str, model: str, max_tokens: int, temperature: float) -> str:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.llm.anthropic_api_key)
    messages = [{"role": "user", "content": prompt}]
    kwargs: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "messages": messages, "temperature": temperature}
    if system:
        kwargs["system"] = system
    response = await client.messages.create(**kwargs)
    return response.content[0].text


async def _call_openai(prompt: str, *, system: str, model: str, max_tokens: int, temperature: float) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.llm.openai_api_key)
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = await client.chat.completions.create(model=model, messages=messages, max_tokens=max_tokens, temperature=temperature)
    return response.choices[0].message.content or ""


async def _call_gemini(prompt: str, *, system: str, model: str, max_tokens: int, temperature: float) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.llm.gemini_api_key)
    gen_model = genai.GenerativeModel(model, system_instruction=system or None)
    response = await gen_model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(max_output_tokens=max_tokens, temperature=temperature),
    )
    return response.text


async def _call_deepseek(prompt: str, *, system: str, model: str, max_tokens: int, temperature: float) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.llm.deepseek_api_key, base_url="https://api.deepseek.com")
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = await client.chat.completions.create(model=model, messages=messages, max_tokens=max_tokens, temperature=temperature)
    return response.choices[0].message.content or ""


async def _call_bedrock(prompt: str, *, system: str, model: str, max_tokens: int, temperature: float) -> str:
    import boto3

    client = boto3.client("bedrock-runtime", region_name=settings.aws.region)
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        body["system"] = system
    response = client.invoke_model(modelId=model, contentType="application/json", accept="application/json", body=json.dumps(body))
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]
