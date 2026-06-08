import type { VisualBlock } from '../types';
import { formatDuration } from '../utils/time';

interface OffTopicBlockProps {
  block: VisualBlock;
}

const OffTopicBlock = ({ block }: OffTopicBlockProps) => (
  <article className="agenda-block off-topic" style={{ minHeight: `${block.heightPercent}%` }}>
    <div>
      <strong>{block.label}</strong>
      <span>{block.heightPercent.toFixed(1)}%</span>
    </div>
    <p>{formatDuration(block.elapsedMs)} outside the planned agenda.</p>
  </article>
);

export default OffTopicBlock;
