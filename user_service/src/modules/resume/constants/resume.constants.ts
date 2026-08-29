export const resumeInclude = {
  educations: { include: { education: { include: { specialization: true } } } },
  workExperiences: { include: { workExperience: true } },
  certificates: true,
  skills: { include: { skill: true } },
  professionalRoles: { include: { professionalRole: true } },
} as const;
