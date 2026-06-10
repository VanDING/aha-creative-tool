import { motion } from 'motion/react';

export function AhaMode() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full h-full"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-light mb-2" style={{ color: 'var(--text)' }}>
          AHA
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>倾倒你的想法，无需整理</p>
      </div>
      <div className="w-full max-w-lg px-4">
        <textarea
          className="w-full h-32 p-4 rounded-lg resize-none focus:outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
          placeholder="在这里写下任何想法...&#10;不需要结构、分类、关联。&#10;按下 Enter 保存。"
        />
      </div>
    </motion.div>
  );
}
