import type { Question, Section } from '../types';

/** True when the questionset has at least one authored Section (MIXED, not FLAT). */
export function hasAuthoredSection(sections: Section[]): boolean {
  return sections.some((s) => !s.isImplicitSection);
}

/**
 * Whether a synthesized (implicit) group takes one place per question in the
 * top-level sequence. Expanding exists so root-level questions can sit
 * alongside real sections; a FLAT set has none to sit alongside, so its single
 * group stays one entry — expanding it would report "SECTIONS 30" for a
 * questionset with no sections at all.
 */
export function expandsPerQuestion(section: Section, sections: Section[]): boolean {
  return Boolean(section.isImplicitSection) && hasAuthoredSection(sections);
}

export type SequenceEntry =
  | { kind: 'section'; sectionIndex: number; section: Section }
  | { kind: 'question'; sectionIndex: number; questionIndex: number; question: Question };

/**
 * The top-level sequence, in order: one entry per real section, one entry per
 * question of an expanded implicit group. The single definition of that
 * expansion — the header rail, the overview cards, the sidebar letters and the
 * "SECTIONS" count all read it, so they cannot drift apart.
 */
export function sequenceEntries(sections: Section[]): SequenceEntry[] {
  return sections.flatMap((section, sectionIndex): SequenceEntry[] =>
    expandsPerQuestion(section, sections)
      ? section.children.map((question, questionIndex) => ({
          kind: 'question',
          sectionIndex,
          questionIndex,
          question,
        }))
      : [{ kind: 'section', sectionIndex, section }],
  );
}

/**
 * 1-based position of a question across the WHOLE assessment.
 *
 * Takes an explicit (sectionIndex, questionIndex) rather than reading current
 * state: a navigation handler runs before its own setCurrentSection/
 * setCurrentQuestion take effect, so current state would report the question
 * being left rather than the one being opened.
 */
export function globalQuestionNumber(
  sections: Section[],
  sectionIndex: number,
  questionIndex: number,
): number {
  const prior = sections
    .slice(0, Math.max(0, sectionIndex))
    .reduce((n, s) => n + s.children.length, 0);
  return prior + questionIndex + 1;
}

/**
 * Display label for a zero-based position in the sequence. Numbered, not
 * lettered: the sequence takes one place per root-level question so it can run
 * well past 26, where `String.fromCharCode(65 + n)` silently produces `[`, `\`,
 * `]`. (Answer-option labels are a different sequence and stay lettered.)
 */
export function stepLabel(ordinal: number): string {
  return String(ordinal + 1);
}

/** Entries in the sequence — the "SECTIONS" stat, and the "Section 3 of 4" denominator. */
export function sectionStepCount(sections: Section[]): number {
  return sequenceEntries(sections).length;
}

/**
 * Zero-based position of `sections[sectionIndex]` in the sequence — not its
 * array index, since an expanded group occupies as many places as it has
 * questions and pushes later sections along.
 */
export function sectionStepOrdinal(sections: Section[], sectionIndex: number): number {
  const at = sequenceEntries(sections).findIndex((e) => e.sectionIndex === sectionIndex);
  return at === -1 ? 0 : at;
}
