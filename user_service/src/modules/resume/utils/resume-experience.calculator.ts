import type { WorkExperiencePeriod } from '../interfaces/resume.interfaces';

export function calculateExperienceMonths(
  experiences: readonly WorkExperiencePeriod[],
  now: Date = new Date(),
): number {
  return experiences.reduce((total, experience) => {
    const end = experience.endedAt ?? now;
    const months =
      (end.getUTCFullYear() - experience.startedAt.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      experience.startedAt.getUTCMonth();

    return total + Math.max(0, months);
  }, 0);
}
