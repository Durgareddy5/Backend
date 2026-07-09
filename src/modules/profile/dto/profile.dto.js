class ProfileDTO {
  formatProfile(profile, user = null) {
    if (!profile) return null;
    return {
      profileId: profile._id,
      userId: profile.userId,
      bio: profile.bio || '',
      dateOfBirth: profile.dateOfBirth || '',
      nationality: profile.nationality || '',
      country: profile.country || '',
      institution: profile.institution || '',
      department: profile.department || '',
      designation: profile.designation || '',
      company: profile.company || '',
      division: profile.division || '',
      position: profile.position || '',
      coverImage: profile.coverImage || 'https://iili.io/C7pZ8Ss.jpg',
      profileImage: profile.profileImage || '',
      researchSummary: profile.researchSummary || '',
      currentResearch: profile.currentResearch || '',
      researchVision: profile.researchVision || '',
      education: profile.education || [],
      experience: profile.experience || [],
      projects: profile.projects || [],
      skills: profile.skills || [],
      achievements: profile.achievements || [],
      certifications: profile.certifications || [],
      metrics: {
        totalCitations: profile.metrics?.totalCitations || 0,
        hIndex: profile.metrics?.hIndex || 0,
        i10Index: profile.metrics?.i10Index || 0,
        researchExperience: profile.metrics?.researchExperience || 0,
        patentsCount: profile.metrics?.patentsCount || 0,
        booksCount: profile.metrics?.booksCount || 0,
        datasetsCount: profile.metrics?.datasetsCount || 0,
        downloadsCount: profile.metrics?.downloadsCount || 0,
        viewsCount: profile.metrics?.viewsCount || 0,
        researchScore: profile.metrics?.researchScore || 0
      },
      socialLinks: {
        orcid: profile.socialLinks?.orcid || '',
        googleScholar: profile.socialLinks?.googleScholar || '',
        researchGate: profile.socialLinks?.researchGate || '',
        linkedin: profile.socialLinks?.linkedin || '',
        website: profile.socialLinks?.website || '',
        scopus: profile.socialLinks?.scopus || ''
      },
      profileCompletion: profile.profileCompletion || 0,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      // If user details are loaded / attached
      ...(user && {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName || `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          profileImage: user.profileImage || ''
        }
      })
    };
  }
}

module.exports = new ProfileDTO();
