<script setup lang="ts">
import { computed } from 'vue'
import { platformMeta } from '@/domain/platforms'

const props = withDefaults(defineProps<{ platform: string; size?: number }>(), { size: 22 })
const meta = computed(() => platformMeta(props.platform))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md"
    :title="meta.label"
    :data-testid="`platform-logo-${meta.id}`"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="meta.label"
  >
    <!-- OpenAI blossom (Simple Icons) -->
    <svg v-if="meta.id === 'openai'" viewBox="0 0 24 24" width="100%" height="100%" fill="#10a37f">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.181a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.058 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.072zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.778-2.758a.795.795 0 0 0 .393-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.495 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.758a.771.771 0 0 0 .781 0l5.843-3.368v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.972V11.6a.766.766 0 0 0 .388.676l5.814 3.354-2.02 1.169a.076.076 0 0 1-.071.005L4.987 13.307A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387 2.023-1.164a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1 .654 8.104v-5.677a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.773-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.306 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.376-3.454l-.142.08L8.704 5.459a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
    <!-- Anthropic asterisk -->
    <svg v-else-if="meta.id === 'anthropic'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#191919" />
      <path fill="#d4a37b" d="M13.35 5h2.7L21 19h-2.55l-.9-2.55h-5.1L11.55 19H9l4.35-14Zm.9 3.15L12.6 13.2h3.3l-1.65-5.05ZM7.2 5h2.4L4.05 19H1.5L7.2 5Z" />
    </svg>
    <!-- Google Gemini sparkle -->
    <svg v-else-if="meta.id === 'gemini'" viewBox="0 0 24 24" width="100%" height="100%">
      <path fill="#8e75ee" d="M12 2c.5 5.2 4.8 9.5 10 10-5.2.5-9.5 4.8-10 10C11.5 16.8 7.2 12.5 2 12 7.2 11.5 11.5 7.2 12 2Z" />
    </svg>
    <!-- xAI / Grok -->
    <svg v-else-if="meta.id === 'grok'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#000" />
      <path fill="#fff" d="M6.8 6h3.1l2.7 4.6L15.6 6H19l-4.6 6.6L19 19.2h-3.2l-2.9-4.9-3.1 4.9H6.6l4.7-6.7L6.8 6Z" />
    </svg>
    <!-- Antigravity -->
    <svg v-else-if="meta.id === 'antigravity'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#1a73e8" />
      <path fill="#fff" d="M12 4.5 18.5 8v8L12 19.5 5.5 16V8L12 4.5Zm0 2.3L8 8.9v6.2l4 2.1 4-2.1V8.9l-4-2.1Zm0 3.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" />
    </svg>
    <!-- Kimi / Moonshot -->
    <svg v-else-if="meta.id === 'kimi'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#0055ff" />
      <path fill="#fff" d="M16.8 8.2a5.4 5.4 0 1 1-7.1 7.1 6.4 6.4 0 1 0 7.1-7.1Z" />
    </svg>
    <!-- 智谱 Zhipu -->
    <svg v-else-if="meta.id === 'zhipu'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#1c4eff" />
      <path fill="#fff" d="M6.5 6.5h11v2.4L10.8 16H17.5v2.5h-11v-2.4L13.2 9H6.5V6.5Z" />
    </svg>
    <!-- DeepSeek -->
    <svg v-else-if="meta.id === 'deepseek'" viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#4d6bfe" />
      <path fill="#fff" d="M7 7.5h6.2c2.7 0 4.8 2 4.8 4.5s-2.1 4.5-4.8 4.5H7V7.5Zm2.4 2.2v4.6h3.7c1.3 0 2.3-1 2.3-2.3s-1-2.3-2.3-2.3H9.4Z" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="4" fill="#64748b" />
      <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">AI</text>
    </svg>
  </span>
</template>
