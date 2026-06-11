import { describe, it, expect } from 'vitest';
import { splitIdeas } from './IdeaSplitter';

describe('splitIdeas', () => {
  it('returns single item for simple input', () => {
    const result = splitIdeas('AI觉醒');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('AI觉醒');
    expect(result[0].content).toBe('AI觉醒');
  });

  it('splits on newlines', () => {
    const result = splitIdeas('AI觉醒\n母子关系\n股市崩盘');
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('AI觉醒');
    expect(result[1].title).toBe('母子关系');
    expect(result[2].title).toBe('股市崩盘');
  });

  it('splits on Chinese period 。', () => {
    const result = splitIdeas('AI觉醒是核心主题。母子关系是情感主线');
    expect(result).toHaveLength(2);
  });

  it('splits on Chinese semicolon ；', () => {
    const result = splitIdeas('探索AI权利；探讨人类未来');
    expect(result).toHaveLength(2);
  });

  it('splits on English period followed by space+uppercase', () => {
    const result = splitIdeas('AI will rise. Humans will adapt');
    expect(result).toHaveLength(2);
  });

  it('does NOT split on English period mid-sentence', () => {
    const result = splitIdeas('Dr. Smith studied AI ethics');
    expect(result).toHaveLength(1);
  });

  it('does NOT split comma/dun-hao unless items are very long', () => {
    // Short items separated by comma → stay together
    const result = splitIdeas('苹果、香蕉、橘子');
    expect(result).toHaveLength(1);
  });

  it('trims whitespace and filters empty items', () => {
    const result = splitIdeas('  AI觉醒  \n\n  母子关系  \n  ');
    expect(result).toHaveLength(2);
  });

  it('uses first 60 chars as title, full text as content', () => {
    const longLine = '这是一个非常长的想法它超过了六十个字符限制所以标题会被截断但内容保留完整原文';
    const result = splitIdeas(longLine);
    expect(result[0].title.length).toBeLessThanOrEqual(60);
    expect(result[0].content).toBe(longLine);
  });

  it('handles mixed delimiters', () => {
    const input = 'AI觉醒\n母子关系；股市崩盘。写诗的程序';
    const result = splitIdeas(input);
    expect(result).toHaveLength(4);
  });

  it('handles empty input', () => {
    expect(splitIdeas('')).toHaveLength(0);
    expect(splitIdeas('   \n  \n ')).toHaveLength(0);
  });
});
