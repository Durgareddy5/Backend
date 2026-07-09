class AuthDTO {
  formatUser(user) {
    if (!user) return null;
    return {
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      researcherType: user.researcherType,
      organizationType: user.organizationType,
      status: user.status,
      emailVerified: user.emailVerified || false,
      username: user.username || '',
      profileSlug: user.profileSlug || '',
      profileUrl: user.profileUrl || '',
      profileImage: user.profileImage || '',
      country: user.country || '',
      lastLogin: user.lastLogin || null,
      lastLoginIP: user.lastLoginIP || '',
      lastLoginDevice: user.lastLoginDevice || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  formatProfile(profile) {
    if (!profile) return null;
    return {
      profileId: profile._id,
      userId: profile.userId,
      bio: profile.bio || '',
      country: profile.country || '',
      institution: profile.institution || '',
      department: profile.department || '',
      designation: profile.designation || '',
      company: profile.company || '',
      division: profile.division || '',
      position: profile.position || '',
      socialLinks: {
        orcid: profile.socialLinks?.orcid || '',
        googleScholar: profile.socialLinks?.googleScholar || '',
        researchGate: profile.socialLinks?.researchGate || '',
        linkedin: profile.socialLinks?.linkedin || '',
        website: profile.socialLinks?.website || ''
      },
      profileCompletion: profile.profileCompletion || 0,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  formatAuthResponse(user, profile, accessToken) {
    return {
      user: this.formatUser(user),
      profile: this.formatProfile(profile),
      accessToken
    };
  }

  formatSession(session) {
    if (!session) return null;
    return {
      sessionId: session._id,
      userId: session.userId,
      browser: session.browser,
      device: session.device,
      os: session.os,
      ip: session.ip || '',
      location: session.location,
      loginTime: session.loginTime,
      logoutTime: session.logoutTime || null,
      rememberMe: session.rememberMe,
      active: session.active
    };
  }

  formatSessionList(sessions = []) {
    return sessions.map(session => this.formatSession(session));
  }
}

module.exports = new AuthDTO();
