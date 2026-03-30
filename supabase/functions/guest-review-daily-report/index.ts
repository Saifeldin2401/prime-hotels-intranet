import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

function timingSafeBearerMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function buildWindow(reportDate?: string) {
  if (reportDate) {
    const end = new Date(`${reportDate}T04:00:00.000Z`);
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

function calculateTrend(current: number, previous: number): { direction: 'up' | 'down' | 'stable'; change: number } {
  if (previous === 0) return { direction: current > 0 ? 'up' : 'stable', change: current };
  const change = Number(((current - previous) / previous * 100).toFixed(1));
  if (Math.abs(change) < 5) return { direction: 'stable', change };
  return { direction: change > 0 ? 'up' : 'down', change: Math.abs(change) };
}

function getRatingClass(rating: number): string {
  if (rating >= 8) return 'excellent';
  if (rating >= 6) return 'good';
  if (rating >= 4) return 'fair';
  return 'poor';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: vaultServiceSecret } = await supabase
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .filter("name", "eq", "service_role_key")
      .limit(1)
      .maybeSingle();

    const isInternal = timingSafeBearerMatch(authHeader, serviceRoleKey)
      || (typeof vaultServiceSecret?.decrypted_secret === "string" &&
        timingSafeBearerMatch(authHeader, vaultServiceSecret.decrypted_secret));

    if (!isInternal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST"
      ? await req.json().catch(() => ({} as Record<string, unknown>))
      : ({} as Record<string, unknown>);
    const reportDate = typeof body.report_date === "string" ? body.report_date : undefined;

    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://phg-connect.com";

    const { start, end } = buildWindow(reportDate);
    
    // 1. Fetch Reviews with FULL CONTENT for real analysis
    const { data: reviews, error: reviewsErr } = await supabase
      .from("guest_reviews")
      .select("id,property_id,platform,sentiment,severity,status,rating_normalized_10,summary_en,review_text,review_title,reviewer_name,reviewer_location,critical_flag,response_sla_due_at,responded_at,created_at,first_acknowledged_at,collected_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    if (reviewsErr) throw reviewsErr;

    const reviewRows = reviews ?? [];
    const totalReviews = reviewRows.length;
    
    if (totalReviews === 0) {
      return new Response(JSON.stringify({ success: true, message: "No reviews found for this window." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch REAL critical reviews (≤5 rating) with full details
    const criticalReviews = reviewRows.filter(r => r.rating_normalized_10 != null && r.rating_normalized_10 <= 5);
    const criticalAlertCount = criticalReviews.length;

    // 2. Fetch Previous Period for Trends (7 days ago same window)
    const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: prevReviews } = await supabase
      .from("guest_reviews")
      .select("id,rating_normalized_10,sentiment")
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", prevEnd.toISOString());
    const prevReviewRows = prevReviews ?? [];

    // 2. Fetch Issues for distribution analysis
    const reviewIds = reviewRows.map(r => r.id);
    const { data: issues } = await supabase
      .from("guest_review_issues")
      .select("review_id, issue_category, severity")
      .in("review_id", reviewIds);

    const issueDistribution = new Map<string, number>();
    const severityDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    (issues ?? []).forEach(iss => {
      const cat = iss.issue_category ?? "Uncategorized";
      issueDistribution.set(cat, (issueDistribution.get(cat) ?? 0) + 1);
      if (iss.severity && severityDistribution[iss.severity as keyof typeof severityDistribution] !== undefined) {
        severityDistribution[iss.severity as keyof typeof severityDistribution]++;
      }
    });

    const topIssuesList = Array.from(issueDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 3. Calculate Core Metrics
    const rated = reviewRows.filter((r: any) => r.rating_normalized_10 != null);
    const averageRating = rated.length > 0
      ? Number((rated.reduce((sum: number, r: any) => sum + Number(r.rating_normalized_10 ?? 0), 0) / rated.length).toFixed(1))
      : 0;
    const prevRated = prevReviewRows.filter((r: any) => r.rating_normalized_10 != null);
    const prevAvgRating = prevRated.length > 0
      ? Number((prevRated.reduce((sum: number, r: any) => sum + Number(r.rating_normalized_10 ?? 0), 0) / prevRated.length).toFixed(1))
      : 0;
    
    const negativeReviewsCount = reviewRows.filter((r: any) => r.sentiment === "negative" || Number(r.rating_normalized_10 ?? 10) <= 6).length;
    const prevNegativeCount = prevReviewRows.filter((r: any) => r.sentiment === "negative" || Number(r.rating_normalized_10 ?? 10) <= 6).length;
    
    const slaMet = reviewRows.filter((r) => 
      !r.response_sla_due_at || (r.responded_at && new Date(r.responded_at) <= new Date(r.response_sla_due_at))
    ).length;
    const slaCompliance = totalReviews > 0 ? Number(((slaMet / totalReviews) * 100).toFixed(1)) : 100;

    // 4. Platform Breakdown
    const platformStats = new Map<string, { count: number; avgRating: number; ratedCount: number; totalRating: number }>();
    for (const r of reviewRows) {
      const key = r.platform || "Unknown";
      const entry = platformStats.get(key) ?? { count: 0, avgRating: 0, ratedCount: 0, totalRating: 0 };
      entry.count += 1;
      if (r.rating_normalized_10 != null) {
        entry.totalRating += Number(r.rating_normalized_10);
        entry.ratedCount += 1;
      }
      platformStats.set(key, entry);
    }
    const platformBreakdown = Array.from(platformStats.entries())
      .map(([platform, stats]) => ({
        platform,
        count: stats.count,
        percentage: Number(((stats.count / totalReviews) * 100).toFixed(1)),
        avgRating: stats.ratedCount > 0 ? Number((stats.totalRating / stats.ratedCount).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 5. Response Time Analysis
    let totalResponseTime = 0;
    let respondedCount = 0;
    let acknowledgedCount = 0;
    let totalAckTime = 0;
    
    for (const r of reviewRows) {
      if (r.responded_at && r.collected_at) {
        const responseTime = new Date(r.responded_at).getTime() - new Date(r.collected_at).getTime();
        totalResponseTime += responseTime;
        respondedCount++;
      }
      if (r.first_acknowledged_at && r.collected_at) {
        const ackTime = new Date(r.first_acknowledged_at).getTime() - new Date(r.collected_at).getTime();
        totalAckTime += ackTime;
        acknowledgedCount++;
      }
    }
    
    const avgResponseTime = respondedCount > 0 ? Math.round(totalResponseTime / respondedCount / (1000 * 60)) : 0;
    const avgAckTime = acknowledgedCount > 0 ? Math.round(totalAckTime / acknowledgedCount / (1000 * 60)) : 0;
    const pendingResponses = reviewRows.filter(r => !r.responded_at && r.status !== 'closed').length;

    // 6. Property Breakdown with Enhanced Metrics
    const propertyCounts = new Map<string, { 
      count: number; 
      neg: number; 
      totalRating: number; 
      rated: number; 
      topIssue: string;
      criticalCount: number;
      avgResponseTime: number;
      respondedCount: number;
    }>();
    
    for (const r of reviewRows) {
      const key = String(r.property_id ?? "");
      const entry = propertyCounts.get(key) ?? { 
        count: 0, neg: 0, totalRating: 0, rated: 0, topIssue: "N/A", 
        criticalCount: 0, avgResponseTime: 0, respondedCount: 0 
      };
      entry.count += 1;
      if (r.sentiment === "negative" || Number(r.rating_normalized_10 ?? 10) <= 6) entry.neg += 1;
      if (r.rating_normalized_10 != null) {
        entry.totalRating += Number(r.rating_normalized_10);
        entry.rated += 1;
      }
      if (r.critical_flag) entry.criticalCount += 1;
      
      if (r.responded_at && r.collected_at) {
        const rt = new Date(r.responded_at).getTime() - new Date(r.collected_at).getTime();
        entry.avgResponseTime += rt;
        entry.respondedCount++;
      }
      
      if (entry.topIssue === "N/A") {
        const reviewIssue = (issues ?? []).find(iss => iss.review_id === r.id);
        if (reviewIssue) entry.topIssue = reviewIssue.issue_category;
      }
      
      propertyCounts.set(key, entry);
    }

    const { data: properties } = await supabase.from("properties").select("id,name").in("id", Array.from(propertyCounts.keys()));
    const propertyNameMap = new Map((properties ?? []).map((p) => [String(p.id), p.name]));

    // Property Performance Ranking
    const propertyRankings = Array.from(propertyCounts.entries())
      .map(([pid, entry]) => ({
        propertyId: pid,
        name: propertyNameMap.get(pid) ?? "Unknown Property",
        count: entry.count,
        avgRating: entry.rated > 0 ? Number((entry.totalRating / entry.rated).toFixed(1)) : 0,
        negativeCount: entry.neg,
        negativeRate: Number(((entry.neg / entry.count) * 100).toFixed(1)),
        criticalCount: entry.criticalCount,
        topIssue: entry.topIssue,
        avgResponseTime: entry.respondedCount > 0 ? Math.round(entry.avgResponseTime / entry.respondedCount / (1000 * 60)) : 0
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    // 7. Trend Analysis
    const ratingTrend = calculateTrend(averageRating, prevAvgRating);
    const volumeTrend = calculateTrend(totalReviews, prevReviewRows.length);
    const negativeTrend = calculateTrend(negativeReviewsCount, prevNegativeCount);

    // 8. Generate REAL AI Analysis per Property with actual review content
    let summaryEn = "A comprehensive analysis of guest feedback across all active properties for the reporting period.";
    let summaryAr = "تحليل شامل لتعليقات الضيوف عبر جميع الفنادق النشطة خلال فترة التقرير.";
    let insightsEn = "No specific insights generated for this period.";
    let insightsAr = "لا توجد رؤى محددة لهذه الفترة.";
    let recommendations: string[] = [];
    
    // Real data structures for property-specific analysis
    const propertyTrends: Record<string, { positive: string[]; negative: string[] }> = {};
    const propertyRecentReviews: Record<string, any[]> = {};
    const propertyCriticalAlerts: Record<string, any[]> = {};
    
    // Group reviews by property for real analysis
    for (const r of reviewRows) {
      const pid = String(r.property_id ?? "");
      if (!propertyRecentReviews[pid]) propertyRecentReviews[pid] = [];
      if (!propertyCriticalAlerts[pid]) propertyCriticalAlerts[pid] = [];
      
      propertyRecentReviews[pid].push(r);
      
      if (r.rating_normalized_10 != null && r.rating_normalized_10 <= 5) {
        propertyCriticalAlerts[pid].push(r);
      }
    }
    
    try {
      // Build REAL review samples with actual content
      const recentReviewSamples = reviewRows
        .slice(0, 15)
        .map(r => ({
          date: new Date(r.created_at).toISOString().split('T')[0],
          platform: r.platform,
          reviewer: r.reviewer_name || 'Guest',
          score: r.rating_normalized_10,
          excerpt: r.summary_en || r.review_text?.substring(0, 150) + '...' || 'No content',
          property: propertyNameMap.get(String(r.property_id)) || 'Unknown'
        }));

      // Build REAL critical alerts table
      const criticalAlertData = criticalReviews.slice(0, 10).map(r => ({
        reviewer: r.reviewer_name || 'Guest',
        platform: r.platform,
        rating: r.rating_normalized_10,
        excerpt: r.summary_en || r.review_text?.substring(0, 200) + '...' || 'No content',
        property: propertyNameMap.get(String(r.property_id)) || 'Unknown'
      }));

      const aiResponse = await fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "chat",
          prompt: `As a Hospitality Executive Consultant for PRIME Hotels, analyze the REAL guest review data below and provide detailed findings.

REAL PERFORMANCE DATA:
- Total Reviews: ${totalReviews}
- Critical Alerts (≤5 rating): ${criticalAlertCount}
- Average Rating: ${averageRating}/10
- Hotels Monitored: ${propertyRankings.length}

REAL RECENT REVIEWS (Last 24h):
${JSON.stringify(recentReviewSamples, null, 2)}

REAL CRITICAL ALERTS (Rating ≤5):
${JSON.stringify(criticalAlertData, null, 2)}

PROPERTY PERFORMANCE:
${propertyRankings.map(p => `- ${p.name}: ${p.avgRating}/10 (${p.count} reviews, ${p.criticalCount} critical)`).join('\n')}

YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT WITH THESE FIELDS:
"summary_en": "Professional executive narrative in English (2 paragraphs)",
"summary_ar": "Professional executive narrative in Arabic (2 paragraphs)",
"insights_en": "3-4 specific operational insights from real data",
"insights_ar": "Arabic translation",
"property_trends": {
  "${propertyRankings[0]?.name || 'Hotel'}": {
    "positive": ["3 real positive trends from actual reviews"],
    "negative": ["3 real negative trends from actual reviews"]
  }
},
"recommendations": [
  { "priority": "HIGH", "hotel": "Hotel Name", "action": "Specific action based on real review content" },
  { "priority": "MEDIUM", "hotel": "Hotel Name", "action": "Specific action" },
  { "priority": "LOW", "hotel": "Hotel Name", "action": "Specific action" }
]

Use ONLY real data from the reviews provided. Do not invent information.`,
        }),
      }).then(res => res.json()).catch(() => null);

      if (aiResponse?.success && aiResponse?.response) {
        try {
          const parsed = JSON.parse(aiResponse.response);
          if (parsed.summary_en) summaryEn = parsed.summary_en;
          if (parsed.summary_ar) summaryAr = parsed.summary_ar;
          if (parsed.insights_en) insightsEn = parsed.insights_en;
          if (parsed.insights_ar) insightsAr = parsed.insights_ar;
          if (parsed.property_trends) {
            Object.assign(propertyTrends, parsed.property_trends);
          }
          if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
            recommendations = parsed.recommendations.map((r: any) => 
              `${r.priority} | ${r.hotel}: ${r.action}`
            );
          }
        } catch (e) {
          console.warn("AI parsing failed:", e);
          summaryEn = aiResponse.response;
        }
      }
    } catch (e) {
      console.warn("AI generation failed:", e);
    }

    // 9. Build Enhanced HTML Components
    const propertyTableHtml = propertyRankings.map((prop, index) => {
      const ratingClass = getRatingClass(prop.avgRating);
      const rankBadge = index < 3 ? `<span class="rank-badge rank-${index + 1}">#${index + 1}</span>` : `<span class="rank-badge">#${index + 1}</span>`;
      return `
        <tr>
          <td class="property-cell">${rankBadge} <span class="property-name">${prop.name}</span></td>
          <td class="text-center">${prop.count}</td>
          <td class="text-center"><span class="rating-chip rating-${ratingClass}">${prop.avgRating}</span></td>
          <td class="text-center"><span class="negative-badge ${prop.negativeRate > 30 ? 'high' : prop.negativeRate > 15 ? 'medium' : 'low'}">${prop.negativeRate}%</span></td>
          <td class="text-center">${prop.criticalCount > 0 ? `<span class="critical-badge">${prop.criticalCount}</span>` : '-'}</td>
          <td class="text-small text-muted">${prop.topIssue}</td>
        </tr>`;
    }).join("");

    const platformHtml = platformBreakdown.map(p => `
      <div class="platform-stat">
        <div class="platform-name">${p.platform}</div>
        <div class="platform-metrics">
          <span class="platform-count">${p.count} reviews</span>
          <span class="platform-percentage">${p.percentage}%</span>
        </div>
        <div class="platform-rating">
          <span class="rating-chip rating-${getRatingClass(p.avgRating)}">${p.avgRating}</span>
        </div>
      </div>
    `).join("");

    const topIssuesHtml = topIssuesList.map(([cat, count], index) => `
      <div class="issue-item ${index < 2 ? 'priority' : ''}">
        <div class="issue-rank">${index + 1}</div>
        <div class="issue-content">
          <div class="issue-category">${cat.replace(/_/g, ' ')}</div>
          <div class="issue-bar">
            <div class="issue-fill" style="width: ${Math.min(100, (count / totalReviews) * 100)}%"></div>
          </div>
        </div>
        <div class="issue-count">${count}</div>
      </div>
    `).join("");

    const recommendationsHtml = recommendations.length > 0 
      ? recommendations.map((rec, i) => `<li class="recommendation-item"><span class="rec-number">${i + 1}</span>${rec}</li>`).join("")
      : '<li class="recommendation-item">Continue monitoring guest feedback trends and maintain current service standards.</li>';

    const severityHtml = `
      <div class="severity-grid">
        <div class="severity-item severity-critical">
          <div class="severity-value">${severityDistribution.critical}</div>
          <div class="severity-label">Critical</div>
        </div>
        <div class="severity-item severity-high">
          <div class="severity-value">${severityDistribution.high}</div>
          <div class="severity-label">High</div>
        </div>
        <div class="severity-item severity-medium">
          <div class="severity-value">${severityDistribution.medium}</div>
          <div class="severity-label">Medium</div>
        </div>
        <div class="severity-item severity-low">
          <div class="severity-value">${severityDistribution.low}</div>
          <div class="severity-label">Low</div>
        </div>
      </div>
    `;

    const trendHtml = `
      <div class="trend-grid">
        <div class="trend-item">
          <div class="trend-label">Volume</div>
          <div class="trend-value trend-${volumeTrend.direction}">
            <span class="trend-icon">${volumeTrend.direction === 'up' ? '↑' : volumeTrend.direction === 'down' ? '↓' : '→'}</span>
            ${volumeTrend.change}%
          </div>
          <div class="trend-compare">vs last week</div>
        </div>
        <div class="trend-item">
          <div class="trend-label">Rating</div>
          <div class="trend-value trend-${ratingTrend.direction === 'up' ? 'up' : ratingTrend.direction === 'down' ? 'down' : 'stable'}">
            <span class="trend-icon">${ratingTrend.direction === 'up' ? '↑' : ratingTrend.direction === 'down' ? '↓' : '→'}</span>
            ${ratingTrend.change}%
          </div>
          <div class="trend-compare">vs last week</div>
        </div>
        <div class="trend-item">
          <div class="trend-label">Negative</div>
          <div class="trend-value trend-${negativeTrend.direction === 'up' ? 'down' : negativeTrend.direction === 'down' ? 'up' : 'stable'}">
            <span class="trend-icon">${negativeTrend.direction === 'up' ? '↑' : negativeTrend.direction === 'down' ? '↓' : '→'}</span>
            ${negativeTrend.change}%
          </div>
          <div class="trend-compare">vs last week</div>
        </div>
      </div>
    `;

    // Build REAL recent reviews sample HTML
    const recentReviewsHtml = reviewRows.slice(0, 10).map((r: any) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      const score = r.rating_normalized_10?.toFixed(1) || 'N/A';
      const excerpt = r.summary_en || (r.review_text ? r.review_text.substring(0, 120) + '...' : 'No content');
      return `<tr>
        <td>${date}</td>
        <td>${r.platform}</td>
        <td>${r.reviewer_name || 'Guest'}</td>
        <td>${score}/10</td>
        <td>${excerpt}</td>
      </tr>`;
    }).join('');

    // Build REAL critical alerts HTML
    const criticalAlertsHtml = criticalReviews.slice(0, 10).map((r: any) => {
      const excerpt = r.summary_en || (r.review_text ? r.review_text.substring(0, 200) + '...' : 'No content');
      return `<tr>
        <td>${r.reviewer_name || 'Guest'}</td>
        <td>${r.platform}</td>
        <td>${r.rating_normalized_10}/10</td>
        <td>${excerpt}</td>
      </tr>`;
    }).join('');

    // Build property scorecards with real trends
    const propertyScorecardsHtml = propertyRankings.map((prop, index) => {
      const trends = propertyTrends[prop.name] || { positive: [], negative: [] };
      const posTrends = trends.positive.length > 0 ? trends.positive : ['No significant positive trends identified'];
      const negTrends = trends.negative.length > 0 ? trends.negative : ['No significant negative trends identified'];
      
      return `
        <div class="hotel-scorecard">
          <div class="hotel-header">
            <span class="hotel-location">${index === 0 ? 'TOP PERFORMER' : ''}</span>
            <h3>${prop.name}</h3>
            <div class="hotel-score ${prop.avgRating >= 8 ? 'good' : prop.avgRating >= 6 ? 'fair' : 'poor'}">
              ${prop.avgRating}/10
            </div>
          </div>
          <div class="hotel-stats">
            Reviews: ${prop.count} | Alerts: ${prop.criticalCount}
          </div>
          <div class="trends-grid">
            <div class="positive-trends">
              <h4>✅ POSITIVE TRENDS</h4>
              <ul>${posTrends.map((t: string) => `<li>${t}</li>`).join('')}</ul>
            </div>
            <div class="negative-trends">
              <h4>⚠️ NEGATIVE TRENDS</h4>
              <ul>${negTrends.map((t: string) => `<li>${t}</li>`).join('')}</ul>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Build operational intelligence matrix
    const operationalMatrixHtml = propertyRankings.map(prop => {
      const trends = propertyTrends[prop.name];
      const priority1 = trends?.negative[0] || 'Monitor feedback trends';
      const priority2 = trends?.negative[1] || 'Maintain service standards';
      const priority3 = trends?.positive[0] || 'Leverage positive feedback';
      
      return `<tr>
        <td>${prop.name}</td>
        <td>${priority1}</td>
        <td>${priority2}</td>
        <td>${priority3}</td>
        <td>${prop.avgRating >= 8 ? '↑' : prop.avgRating >= 6 ? '→' : '↓'}</td>
      </tr>`;
    }).join('');

    const reportDateValue = reportDate ? reportDate : end.toISOString().slice(0, 10);
    const generatedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });
    
    // 10. Save and Send
    const { data: reportRow, error: reportErr } = await supabase
      .from("guest_review_daily_reports")
      .insert({
        report_date: reportDateValue,
        scope_level: "group",
        title: `Daily Online Reputation Report - ${reportDateValue}`,
        summary_json: {
          total_reviews: totalReviews,
          average_rating: averageRating,
          critical_alerts: criticalAlertCount,
          hotels_monitored: propertyRankings.length,
          property_rankings: propertyRankings,
          property_trends: propertyTrends,
          recent_reviews: reviewRows.slice(0, 15).map((r: any) => ({
            date: r.created_at,
            platform: r.platform,
            reviewer: r.reviewer_name,
            score: r.rating_normalized_10,
            excerpt: r.summary_en || r.review_text?.substring(0, 150)
          })),
          critical_reviews: criticalReviews.slice(0, 10).map((r: any) => ({
            reviewer: r.reviewer_name,
            platform: r.platform,
            rating: r.rating_normalized_10,
            excerpt: r.summary_en || r.review_text?.substring(0, 200)
          })),
          recommendations,
          narrative_en: summaryEn,
          narrative_ar: summaryAr,
          insights_en: insightsEn,
          insights_ar: insightsAr
        },
        status: "completed",
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (reportErr) throw reportErr;

    const { data: recipients } = await supabase
      .from("guest_review_report_recipients")
      .select("email")
      .eq("is_active", true);

    const emails = Array.from(new Set((recipients ?? []).map((r) => String((r as any).email ?? "").trim()).filter(Boolean)));

    if (emails.length > 0) {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emails,
          templateKey: "review_daily_exec_digest",
          businessDomain: "management",
          notificationType: "system",
          title: `Daily Online Reputation Report - ${reportDateValue}`,
          actionUrl: `${appBaseUrl.replace(/\/+$/, "")}/reviews?tab=executive`,
          variables: {
            // Header info
            report_date: reportDateValue,
            generated_time: generatedTime,
            
            // Executive Summary metrics
            total_reviews: totalReviews.toString(),
            average_rating: `${averageRating}/10`,
            critical_alerts: criticalAlertCount.toString(),
            hotels_monitored: propertyRankings.length.toString(),
            
            // Narrative content
            summary_en: summaryEn,
            summary_ar: summaryAr,
            insights_en: insightsEn,
            insights_ar: insightsAr,
            
            // Real data HTML components
            property_scorecards: propertyScorecardsHtml,
            recent_reviews_table: recentReviewsHtml,
            critical_alerts_table: criticalAlertsHtml,
            operational_matrix: operationalMatrixHtml,
            recommendations_list: recommendations.length > 0 
              ? recommendations.map((r, i) => `<li class="rec-item"><span class="rec-num">${i + 1}</span>${r}</li>`).join('')
              : '<li>No specific recommendations generated</li>',
            
            // Individual metrics for subject line
            top_performer: propertyRankings[0]?.name || "N/A",
            top_performer_rating: propertyRankings[0]?.avgRating.toString() || "0",
            needs_attention: propertyRankings[propertyRankings.length - 1]?.name || "N/A"
          },
        }),
      }).catch(err => console.error("Email send failed:", err));

      await supabase
        .from("guest_review_daily_reports")
        .update({ emailed_to: emails })
        .eq("id", reportRow.id);
    }

    return new Response(JSON.stringify({
      success: true,
      report_id: reportRow.id,
      message: `Report generated for ${reportDateValue} with ${totalReviews} reviews. Sent to ${emails.length} recipients.`
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("guest-review-daily-report failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

