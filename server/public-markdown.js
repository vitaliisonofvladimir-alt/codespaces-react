// Keep these summaries aligned with the public React pages when their copy changes.
export const publicMarkdown = new Map([
  ['/', `# NVVAI — AI-помощник

Задай вопрос голосом или текстом — отвечу ясно и по существу.

Примеры запросов:
- Объясни сложную тему простыми словами.
- Помоги мне написать и улучшить текст.
- Предложи несколько свежих идей для моего проекта.

[Кабинет владельца](https://app.nvvai.site/)

NVVAI может ошибаться. Проверяй важную информацию.
`],
  ['/demo/hvac', `# Демонстрация HVAC-сервиса

## Комфорт начинается с простого разговора

Опиши, что нужно с климатической системой. Демонстрационная команда свяжется с тобой, чтобы уточнить детали.

Это демонстрация продукта, не реальная служба обслуживания.

## Типовые запросы

- **Ремонт:** Система работает не так, как ожидается?
- **Установка:** Планируешь установить или заменить оборудование?
- **Обслуживание:** Нужна проверка или сезонная профилактика?

## Расскажи, чем помочь

Оставь контакт и краткое описание. Можно указать удобное время для связи. Заявка занимает около минуты.

Форма на [странице демонстрации](https://nvvai.site/demo/hvac) запрашивает имя, телефон или email, описание задачи и, при желании, удобное время для связи. Для отправки нужна проверка безопасности.
`],
]);

export function acceptsMarkdown(accept = '') {
  return accept.split(',').some((part) => {
    const [type, ...parameters] = part.trim().split(';');
    if (type.trim().toLowerCase() !== 'text/markdown') return false;
    const quality = parameters.find((parameter) => parameter.trim().toLowerCase().startsWith('q='));
    return !quality || Number(quality.trim().slice(2)) > 0;
  });
}

export function markdownResponse(content, { head = false } = {}) {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Language': 'ru',
    'Content-Signal': 'ai-train=no, search=yes, ai-input=no',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vary': 'Accept',
    'x-markdown-tokens': String(Math.ceil(content.length / 4)),
  });
  return new Response(head ? null : content, { status: 200, headers });
}
