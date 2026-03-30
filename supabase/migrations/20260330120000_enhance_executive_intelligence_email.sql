-- Migration: Enhance Executive Intelligence Email Template for Guest Review Analysis
-- Created: 2026-03-30
-- Description: Comprehensive upgrade to the daily executive digest email with professional styling and enhanced sections

BEGIN;

-- Update the email template with comprehensive HTML design
UPDATE public.notification_email_templates
SET
  subject_template = 'Executive Intelligence: Guest Review Analysis - {{report_date}} | {{property_count}} Properties | {{average_rating}} Avg Rating',
  html_template = '<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; }
    
    /* Header */
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 32px; text-align: center; }
    .header-logo { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.5px; }
    .header-subtitle { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
    .header-title { font-size: 28px; font-weight: 600; color: #ffffff; margin-top: 24px; line-height: 1.3; }
    .header-date { font-size: 16px; color: #cbd5e1; margin-top: 8px; }
    
    /* Executive Summary */
    .executive-summary { padding: 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }
    .summary-text { font-size: 15px; color: #475569; line-height: 1.8; }
    .summary-text.ar { direction: rtl; text-align: right; margin-top: 20px; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
    
    /* Key Metrics Grid */
    .metrics-section { padding: 32px; }
    .metrics-grid { display: table; width: 100%; margin-bottom: 32px; }
    .metric-card { display: table-cell; width: 25%; padding: 24px 16px; text-align: center; border-right: 1px solid #e2e8f0; }
    .metric-card:last-child { border-right: none; }
    .metric-value { font-size: 32px; font-weight: 700; color: #1e293b; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .metric-change { font-size: 12px; margin-top: 4px; font-weight: 500; }
    .metric-change.up { color: #059669; }
    .metric-change.down { color: #dc2626; }
    
    /* Trend Indicators */
    .trend-section { background: #f1f5f9; padding: 24px 32px; margin: 0 32px 32px; border-radius: 12px; }
    .trend-grid { display: table; width: 100%; }
    .trend-item { display: table-cell; width: 33.33%; text-align: center; padding: 16px; }
    .trend-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .trend-value { font-size: 24px; font-weight: 700; margin: 8px 0; }
    .trend-value.up { color: #059669; }
    .trend-value.down { color: #dc2626; }
    .trend-value.stable { color: #64748b; }
    .trend-compare { font-size: 11px; color: #94a3b8; }
    
    /* Section Headers */
    .section-header { padding: 24px 32px 16px; border-bottom: 2px solid #e2e8f0; }
    .section-header h2 { font-size: 18px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 12px; }
    .section-icon { width: 32px; height: 32px; background: #e0e7ff; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; }
    
    /* Property Performance Table */
    .property-section { padding: 0 32px 32px; }
    .property-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .property-table th { text-align: left; padding: 16px 12px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    .property-table td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .property-table tr:hover { background: #f8fafc; }
    .text-center { text-align: center; }
    .text-small { font-size: 12px; }
    .text-muted { color: #64748b; }
    
    /* Rank Badge */
    .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 12px; font-weight: 700; margin-right: 12px; }
    .rank-badge.rank-1 { background: #fef3c7; color: #d97706; }
    .rank-badge.rank-2 { background: #f3f4f6; color: #6b7280; }
    .rank-badge.rank-3 { background: #fef2f2; color: #b45309; }
    .rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) { background: #f1f5f9; color: #64748b; }
    .property-name { font-weight: 500; color: #1e293b; }
    .property-cell { display: flex; align-items: center; }
    
    /* Rating Chips */
    .rating-chip { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .rating-chip.rating-excellent { background: #d1fae5; color: #047857; }
    .rating-chip.rating-good { background: #dbeafe; color: #0369a1; }
    .rating-chip.rating-fair { background: #fef3c7; color: #b45309; }
    .rating-chip.rating-poor { background: #fee2e2; color: #dc2626; }
    
    /* Negative Badge */
    .negative-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .negative-badge.low { background: #d1fae5; color: #047857; }
    .negative-badge.medium { background: #fef3c7; color: #b45309; }
    .negative-badge.high { background: #fee2e2; color: #dc2626; }
    
    /* Critical Badge */
    .critical-badge { display: inline-block; padding: 2px 8px; background: #fee2e2; color: #dc2626; border-radius: 12px; font-size: 11px; font-weight: 600; }
    
    /* Platform Stats */
    .platform-section { padding: 0 32px 32px; }
    .platform-grid { display: table; width: 100%; }
    .platform-stat { display: table-row; }
    .platform-stat > div { display: table-cell; padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .platform-name { font-weight: 500; color: #1e293b; width: 25%; }
    .platform-metrics { width: 40%; }
    .platform-count { color: #475569; margin-right: 12px; }
    .platform-percentage { color: #64748b; font-size: 12px; }
    .platform-rating { text-align: right; width: 35%; }
    
    /* Issues Section */
    .issues-section { padding: 0 32px 32px; }
    .issue-item { display: flex; align-items: center; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
    .issue-item.priority { background: #fefce8; margin: 0 -16px; padding: 16px; border-radius: 8px; }
    .issue-rank { width: 32px; height: 32px; background: #e0e7ff; color: #4338ca; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; margin-right: 16px; flex-shrink: 0; }
    .issue-content { flex: 1; }
    .issue-category { font-weight: 500; color: #1e293b; margin-bottom: 6px; }
    .issue-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .issue-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; }
    .issue-count { width: 60px; text-align: right; font-weight: 600; color: #64748b; }
    
    /* Severity Grid */
    .severity-section { padding: 0 32px 32px; }
    .severity-grid { display: table; width: 100%; background: #f8fafc; border-radius: 12px; overflow: hidden; }
    .severity-item { display: table-cell; width: 25%; padding: 24px; text-align: center; border-right: 1px solid #e2e8f0; }
    .severity-item:last-child { border-right: none; }
    .severity-value { font-size: 28px; font-weight: 700; }
    .severity-item.severity-critical .severity-value { color: #dc2626; }
    .severity-item.severity-high .severity-value { color: #ea580c; }
    .severity-item.severity-medium .severity-value { color: #d97706; }
    .severity-item.severity-low .severity-value { color: #059669; }
    .severity-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    
    /* Insights Section */
    .insights-section { padding: 0 32px 32px; }
    .insights-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px 24px; border-radius: 0 8px 8px 0; }
    .insights-box.ar { direction: rtl; text-align: right; border-left: none; border-right: 4px solid #3b82f6; border-radius: 8px 0 0 8px; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
    .insights-title { font-size: 12px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .insights-text { font-size: 14px; color: #1e40af; line-height: 1.7; }
    
    /* Recommendations */
    .recommendations-section { padding: 0 32px 32px; }
    .recommendations-list { list-style: none; }
    .recommendation-item { display: flex; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
    .rec-number { width: 28px; height: 28px; background: #1e293b; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 16px; flex-shrink: 0; }
    .recommendation-item span:not(.rec-number) { flex: 1; font-size: 14px; color: #475569; line-height: 1.6; }
    
    /* Call to Action */
    .cta-section { padding: 32px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .cta-button { display: inline-block; padding: 16px 32px; background: #1e293b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s; }
    .cta-button:hover { background: #334155; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30, 41, 59, 0.15); }
    
    /* Footer */
    .footer { padding: 24px 32px; text-align: center; background: #f1f5f9; }
    .footer-text { font-size: 12px; color: #64748b; }
    .footer-brand { font-weight: 600; color: #1e293b; }
    
    /* Responsive */
    @media (max-width: 640px) {
      .metrics-grid, .trend-grid, .platform-grid, .severity-grid { display: block; }
      .metric-card, .trend-item, .severity-item { display: block; width: 100%; border-right: none; border-bottom: 1px solid #e2e8f0; }
      .property-table th, .property-table td { padding: 12px 8px; font-size: 12px; }
      .header { padding: 24px 16px; }
      .header-title { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">PHG Connect</div>
      <div class="header-subtitle">Executive Intelligence Report</div>
      <h1 class="header-title">Guest Review Analysis</h1>
      <div class="header-date">{{report_date}}</div>
    </div>
    
    <!-- Executive Summary -->
    <div class="executive-summary">
      <div class="section-title">Executive Summary</div>
      <p class="summary-text">{{summary_en}}</p>
      <p class="summary-text ar">{{summary_ar}}</p>
    </div>
    
    <!-- Key Metrics -->
    <div class="metrics-section">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">{{total_reviews}}</div>
          <div class="metric-label">Total Reviews</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{average_rating}}</div>
          <div class="metric-label">Average Rating</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{sla_compliance}}</div>
          <div class="metric-label">SLA Compliance</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{avg_response_time}}</div>
          <div class="metric-label">Avg Response Time</div>
        </div>
      </div>
      
      <!-- Trend Indicators -->
      <div class="trend-section">
        {{trend_indicators}}
      </div>
    </div>
    
    <!-- Property Performance -->
    <div class="section-header">
      <h2><span class="section-icon">🏨</span> Property Performance Rankings</h2>
    </div>
    <div class="property-section">
      <table class="property-table">
        <thead>
          <tr>
            <th>Property</th>
            <th class="text-center">Reviews</th>
            <th class="text-center">Rating</th>
            <th class="text-center">Negative</th>
            <th class="text-center">Critical</th>
            <th>Top Issue</th>
          </tr>
        </thead>
        <tbody>
          {{property_table}}
        </tbody>
      </table>
    </div>
    
    <!-- Platform Distribution -->
    <div class="section-header">
      <h2><span class="section-icon">📊</span> Platform Distribution</h2>
    </div>
    <div class="platform-section">
      <div class="platform-grid">
        {{platform_breakdown}}
      </div>
    </div>
    
    <!-- Top Issues -->
    <div class="section-header">
      <h2><span class="section-icon">⚠️</span> Top Issue Categories</h2>
    </div>
    <div class="issues-section">
      {{top_issues}}
    </div>
    
    <!-- Severity Distribution -->
    <div class="section-header">
      <h2><span class="section-icon">🎯</span> Severity Distribution</h2>
    </div>
    <div class="severity-section">
      {{severity_distribution}}
    </div>
    
    <!-- Operational Insights -->
    <div class="section-header">
      <h2><span class="section-icon">💡</span> Operational Insights</h2>
    </div>
    <div class="insights-section">
      <div class="insights-box">
        <div class="insights-title">Key Insights</div>
        <p class="insights-text">{{insights_en}}</p>
      </div>
      <div class="insights-box ar" style="margin-top: 16px;">
        <div class="insights-title">رؤى رئيسية</div>
        <p class="insights-text">{{insights_ar}}</p>
      </div>
    </div>
    
    <!-- Recommendations -->
    <div class="section-header">
      <h2><span class="section-icon">🎯</span> Executive Recommendations</h2>
    </div>
    <div class="recommendations-section">
      <ul class="recommendations-list">
        {{recommendations}}
      </ul>
    </div>
    
    <!-- Call to Action -->
    <div class="cta-section">
      <a href="{{action_url}}" class="cta-button">View Full Executive Dashboard</a>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        <span class="footer-brand">PHG Connect</span> — Empowering Hospitality Excellence<br>
        This report covers {{property_count}} properties with {{total_reviews}} guest reviews
      </p>
    </div>
  </div>
</body>
</html>',
  text_template = 'PHG CONNECT - EXECUTIVE INTELLIGENCE: GUEST REVIEW ANALYSIS
Report Date: {{report_date}}

EXECUTIVE SUMMARY:
{{summary_en}}

KEY METRICS:
- Total Reviews: {{total_reviews}}
- Average Rating: {{average_rating}}
- SLA Compliance: {{sla_compliance}}
- Average Response Time: {{avg_response_time}}
- Pending Responses: {{pending_responses}}

PROPERTY PERFORMANCE:
Top Performer: {{top_performer}} ({{top_performer_rating}}/10)
Needs Attention: {{needs_attention}}

Total Properties: {{property_count}}
View full dashboard: {{action_url}}',
  from_name = 'PHG Connect Executive Intelligence',
  from_email = 'executive-reports@phg-connect.com',
  metadata = '{"domain":"guest_reviews","version":"2.0","enhanced":true}'::jsonb,
  updated_at = NOW()
WHERE template_key = 'review_daily_exec_digest';

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_email_templates 
    WHERE template_key = 'review_daily_exec_digest' 
    AND metadata->>'enhanced' = 'true'
  ) THEN
    RAISE EXCEPTION 'Template update failed - review_daily_exec_digest not found or not enhanced';
  END IF;
  
  RAISE NOTICE 'Successfully enhanced review_daily_exec_digest email template';
END
$$;

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
