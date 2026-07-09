/**
 * RankingEngine — Modular, rule-based feed ranking.
 * Each scoring method is isolated and replaceable.
 * Future AI integration: swap scoring methods with ML model outputs.
 *
 * Final score = sum of all applicable signals.
 * Higher score → higher in feed.
 */
class RankingEngine {
  // ─── Connection Signals ──────────────────────────────────────────────────────

  /**
   * Actor is directly followed by the viewer (+60)
   */
  scoreByFollowing(event, followingIds = []) {
    const actorStr = event.actorId?.toString();
    if (actorStr && followingIds.map(String).includes(actorStr)) {
      return 60;
    }
    return 0;
  }

  /**
   * Actor is connected to the viewer (+40)
   */
  scoreByConnection(event, connectionIds = []) {
    const actorStr = event.actorId?.toString();
    if (actorStr && connectionIds.map(String).includes(actorStr)) {
      return 40;
    }
    return 0;
  }



  /**
   * Event belongs to a collaboration the viewer is in (+25)
   */
  scoreByCollaboration(event, collaborationIds = []) {
    const metaCollab = event.metadata?.collaborationId?.toString();
    if (metaCollab && collaborationIds.map(String).includes(metaCollab)) {
      return 25;
    }
    return 0;
  }

  // ─── Demographic Signals ────────────────────────────────────────────────────

  /**
   * Event actor is from the same institution (+15)
   */
  scoreByInstitution(event, userInstitution) {
    if (!userInstitution || !event.metadata?.institution) return 0;
    const match = event.metadata.institution.toLowerCase().trim() === userInstitution.toLowerCase().trim();
    return match ? 15 : 0;
  }

  /**
   * Event actor is from the same country (+8)
   */
  scoreByCountry(event, userCountry) {
    if (!userCountry || !event.metadata?.country) return 0;
    const match = event.metadata.country.toLowerCase().trim() === userCountry.toLowerCase().trim();
    return match ? 8 : 0;
  }

  // ─── Interest Signals ───────────────────────────────────────────────────────

  /**
   * Each matching keyword/research area gives +12
   */
  scoreByResearchArea(event, userInterests = []) {
    if (!userInterests.length) return 0;
    const normalizedInterests = userInterests.map(i => i.toLowerCase().trim());
    const keywords = (event.metadata?.keywords || []).map(k => k.toLowerCase().trim());
    const researchArea = event.metadata?.researchArea?.toLowerCase().trim() || '';

    let score = 0;
    keywords.forEach(kw => {
      if (normalizedInterests.some(i => i.includes(kw) || kw.includes(i))) {
        score += 12;
      }
    });
    if (researchArea && normalizedInterests.some(i => i.includes(researchArea) || researchArea.includes(i))) {
      score += 10;
    }
    return Math.min(score, 60); // Cap at 60 to avoid runaway keyword scores
  }

  // ─── Popularity / Engagement Signals ───────────────────────────────────────

  /**
   * Engagement-weighted popularity score
   * citations×1.5 + views×0.1 + downloads×0.5
   */
  scoreByPopularity(event) {
    const meta = event.metadata || {};
    const citations = (meta.citations || 0) * 1.5;
    const views = (meta.views || 0) * 0.1;
    const downloads = (meta.downloads || 0) * 0.5;
    const engagement = event.engagementCount || {};
    const likes = (engagement.likes || 0) * 2;
    const comments = (engagement.comments || 0) * 3;
    const shares = (engagement.shares || 0) * 4;
    return Math.min(citations + views + downloads + likes + comments + shares, 80);
  }

  /**
   * Recency decay function.
   * Fresh (< 1h) → +30
   * < 24h → +20
   * < 7d → +10
   * Older → +5
   */
  scoreByRecency(event) {
    const now = Date.now();
    const created = new Date(event.createdAt).getTime();
    const ageHours = (now - created) / (1000 * 60 * 60);

    if (ageHours < 1) return 30;
    if (ageHours < 24) return 20;
    if (ageHours < 168) return 10; // 7 days
    return 5;
  }

  /**
   * Event type priority boosts.
   * Certain event types are surfaced higher regardless of other signals.
   */
  scoreByEventType(event) {
    const boosts = {
      publication_uploaded: 10,
      citation_increased: 8,
      funding_opportunity: 15,
      academic_job: 10,
      award: 12,
      achievement: 10,
      research_collaboration: 8,
      milestone: 6,
      conference_deadline: 14,
      dataset_uploaded: 5,
      researcher_followed: 4,
      research_question: 7,
      research_answer: 7
    };
    return boosts[event.eventType] || 3;
  }

  // ─── Composite Score ────────────────────────────────────────────────────────

  /**
   * Compute the final relevance score for one event given user context.
   *
   * @param {Object} event — FeedEvent document (plain object)
   * @param {Object} userContext — { followingIds, connectionIds, collaborationIds,
   *                                  researchInterests, institution, country }
   * @returns {number} finalScore
   */
  computeFinalScore(event, userContext = {}) {
    const {
      followingIds = [],
      connectionIds = [],
      collaborationIds = [],
      researchInterests = [],
      institution = '',
      country = ''
    } = userContext;

    const score =
      this.scoreByFollowing(event, followingIds) +
      this.scoreByConnection(event, connectionIds) +
      this.scoreByCollaboration(event, collaborationIds) +
      this.scoreByInstitution(event, institution) +
      this.scoreByCountry(event, country) +
      this.scoreByResearchArea(event, researchInterests) +
      this.scoreByPopularity(event) +
      this.scoreByRecency(event) +
      this.scoreByEventType(event);

    return Math.round(score);
  }

  /**
   * Batch-score a list of events for a user.
   * Returns events sorted by score descending.
   *
   * @param {Array} events
   * @param {Object} userContext
   * @returns {Array} sorted events with _score attached
   */
  rankEvents(events, userContext = {}) {
    return events
      .map(event => ({
        ...event,
        _score: this.computeFinalScore(event, userContext)
      }))
      .sort((a, b) => b._score - a._score);
  }
}

module.exports = new RankingEngine();
