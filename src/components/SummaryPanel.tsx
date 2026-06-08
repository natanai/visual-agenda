import type { VisualCalculation } from '../types';
import { formatDuration } from '../utils/time';

interface SummaryPanelProps {
  calculation: VisualCalculation;
}

const SummaryPanel = ({ calculation }: SummaryPanelProps) => (
  <section className="panel summary" aria-labelledby="summary-heading">
    <div className="panel-heading">
      <p className="eyebrow">Summary</p>
      <h2 id="summary-heading">Meeting time</h2>
    </div>
    <dl className="summary-grid">
      <div>
        <dt>Planned</dt>
        <dd>{formatDuration(calculation.plannedMeetingMs)}</dd>
      </div>
      <div>
        <dt>Elapsed</dt>
        <dd>{formatDuration(calculation.totalElapsedMs)}</dd>
      </div>
      <div>
        <dt>Off-topic</dt>
        <dd>{formatDuration(calculation.offTopicMs)}</dd>
      </div>
      <div>
        <dt>Overtime</dt>
        <dd>{formatDuration(calculation.overtimeMs)}</dd>
      </div>
    </dl>
  </section>
);

export default SummaryPanel;
