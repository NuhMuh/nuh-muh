// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),

  // Astro 7은 compressHTML 기본값이 'jsx'다 — 인접 인라인 요소 사이 공백을
  // JSX 규칙으로 지운다 ("hello world" → "helloworld"). true로 명시해 6판
  // 동작을 고정한다.
  //
  // 이것은 해결이 아니라 유예다. 새 동작을 검증한 것이 아니라 옛 동작을
  // 붙잡은 것이므로, 'jsx'로 옮길지는 따로 판단한다.
  // (「스택과 기술 함정」 §1 후속 판단)
  //
  // 미확인: 7판에서 true가 6판 동작을 유지하는지는 확인된 바 없다.
  // 업그레이드 뒤에도 공백이 사라지면 true가 'jsx'로 매핑된 것이므로
  // false로 명시한다. (부록 C-15)
  compressHTML: true,
});
