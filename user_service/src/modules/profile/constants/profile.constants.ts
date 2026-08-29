export const educationInclude = { specialization: true } as const;

export const profileInclude = {
  user: { include: { contact: true } },
  languages: { include: { language: true } },
  citizenships: { include: { country: true } },
  educations: { include: educationInclude, orderBy: { endedAt: 'desc' as const } },
  experiences: { orderBy: { startedAt: 'desc' as const } },
} as const;
