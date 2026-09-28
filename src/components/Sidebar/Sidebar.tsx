import { useState } from 'react';
import { t, readI18n } from '../../i18n/translations';
import { isAnswered } from '../../utils/answered';
import { ChevronRightIcon } from '../icons';
import { expandsPerQuestion, sectionStepOrdinal, stepLabel } from '../../utils/sections';
import type { Section, Question, AnswersMap } from '../../types';
import styles from './Sidebar.module.scss';

/**
 * Sidebar — persistent section/question navigator (Phase 6 design).
 *
 * Pure presentational `nav` landmark over the top-level sequence
 * (`utils/sections`): a real section is one collapsible card whose questions
 * are unnumbered sub-items; a root-level question is a numbered row of its
 * own, a sibling of the section cards rather than a child. Jump intent is
 * emitted via `onSectionJump`/`onQuestionJump`. The only local state is
 * expand/collapse — a view concern, no Context mutation.
 */
export interface SidebarProps {
  sections: Section[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: AnswersMap;
  onSectionJump: (sectionIndex: number) => void;
  /** Jump straight to a specific question, in a specific (possibly different) section. */
  onQuestionJump: (sectionIndex: number, questionIndex: number) => void;
  language?: string;
}

function answeredCount(section: Section, answers: AnswersMap): number {
  return section.children.reduce((n, q) => (isAnswered(answers[q.identifier]) ? n + 1 : n), 0);
}

/** A question's short label: its own title if authored, else a positional fallback. */
function questionLabel(question: Question, qIndex: number, language: string): string {
  return question.name || `${t(language, 'QUESTION')} ${qIndex + 1}`;
}

const ROW_STYLES = {
  loose: {
    base: styles.looseItem,
    active: styles.looseItemActive,
    answered: styles.looseItemAnswered,
  },
  sub: { base: styles.subItem, active: styles.subItemActive, answered: styles.subItemAnswered },
} as const;

/**
 * A question row. `loose` is a root-level question — a top-level step in its
 * own right, so it carries a badge and its own ●/○ dot, there being no section
 * card aggregating it into a count. `sub` is a question under a real section,
 * whose card already covers both.
 */
function QuestionRow({
  question,
  qIndex,
  isActive,
  answered,
  variant,
  onClick,
  language,
  letter,
}: {
  question: Question;
  qIndex: number;
  isActive: boolean;
  answered: boolean;
  variant: 'loose' | 'sub';
  onClick: () => void;
  language: string;
  letter?: string;
}) {
  const row = ROW_STYLES[variant];
  return (
    <li key={question.identifier}>
      <button
        type="button"
        className={[row.base, answered && row.answered, isActive && row.active]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        aria-current={isActive ? 'true' : undefined}
      >
        {letter && (
          <span
            className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`.trim()}
            aria-hidden="true"
          >
            {letter}
          </span>
        )}
        <span className={styles.subName}>{questionLabel(question, qIndex, language)}</span>
        {variant === 'loose' && (
          <span
            className={`${styles.statusDot} ${answered ? styles.statusDotAnswered : ''}`.trim()}
            aria-label={t(language, answered ? 'ANSWERED' : 'UNANSWERED')}
          >
            {answered ? '●' : '○'}
          </span>
        )}
      </button>
    </li>
  );
}

export function Sidebar({
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  answers,
  onSectionJump,
  onQuestionJump,
  language = 'en',
}: SidebarProps) {
  // Explicit per-section expand/collapse overrides. Absent an override, a
  // section defaults to expanded only while it's the active one — everything
  // else starts collapsed; the chevron lets the learner override either way.
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});
  const toggleExpand = (identifier: string, currentlyExpanded: boolean) =>
    setExpandOverride((prev) => ({ ...prev, [identifier]: !currentlyExpanded }));

  return (
    <nav className={styles.sidebar} aria-label={t(language, 'NAVIGATION')}>
      <p className={styles.label}>{t(language, 'SECTIONS')}</p>

      <ul className={styles.list}>
        {sections.map((section, sectionIndex) => {
          // Implicit section (root-level questions, no authored Section
          // wrapper): no header, no collapse — each question is a top-level
          // row. It only carries a number when there are real sections to
          // sequence against, so a FLAT set's rows stay unnumbered.
          if (section.isImplicitSection) {
            const lettered = expandsPerQuestion(section, sections);
            const firstOrdinal = sectionStepOrdinal(sections, sectionIndex);
            return section.children.map((question, qIndex) => (
              <QuestionRow
                key={question.identifier}
                question={question}
                qIndex={qIndex}
                isActive={sectionIndex === currentSectionIndex && qIndex === currentQuestionIndex}
                answered={isAnswered(answers[question.identifier])}
                variant="loose"
                onClick={() => onQuestionJump(sectionIndex, qIndex)}
                language={language}
                letter={lettered ? stepLabel(firstOrdinal + qIndex) : undefined}
              />
            ));
          }

          const isActive = sectionIndex === currentSectionIndex;
          const isExpanded = expandOverride[section.identifier] ?? isActive;
          const total = section.children.length;
          const answered = answeredCount(section, answers);
          const blurb = readI18n(section.description, language);
          const name = readI18n(section.name, language);
          const letter = stepLabel(sectionStepOrdinal(sections, sectionIndex));

          return (
            <li key={section.identifier}>
              <div className={`${styles.card} ${isActive ? styles.active : ''}`.trim()}>
                <button
                  type="button"
                  className={styles.cardMain}
                  onClick={() => onSectionJump(sectionIndex)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span
                    className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`.trim()}
                    aria-hidden="true"
                  >
                    {letter}
                  </span>
                  <span className={styles.text}>
                    <span className={styles.name}>{name}</span>
                    {blurb && <span className={styles.blurb}>{blurb}</span>}
                    <span className={styles.status}>
                      <span className={styles.answered} aria-label={`${t(language, 'ANSWERED')} ${answered}`}>
                        <span aria-hidden="true">● {answered}</span>
                      </span>
                      <span
                        className={styles.remaining}
                        aria-label={`${t(language, 'UNANSWERED')} ${total - answered}`}
                      >
                        <span aria-hidden="true">○ {total - answered}</span>
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.expandToggle}
                  onClick={() => toggleExpand(section.identifier, isExpanded)}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded ? t(language, 'COLLAPSE_SECTION') : t(language, 'EXPAND_SECTION')
                  }
                >
                  <ChevronRightIcon
                    size={18}
                    className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`.trim()}
                  />
                </button>
              </div>

              {isExpanded && (
                <ul className={styles.subList}>
                  {section.children.map((question, qIndex) => (
                    <QuestionRow
                      key={question.identifier}
                      question={question}
                      qIndex={qIndex}
                      isActive={sectionIndex === currentSectionIndex && qIndex === currentQuestionIndex}
                      answered={isAnswered(answers[question.identifier])}
                      variant="sub"
                      onClick={() => onQuestionJump(sectionIndex, qIndex)}
                      language={language}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
